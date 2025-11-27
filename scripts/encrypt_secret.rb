#!/usr/bin/env ruby
# frozen_string_literal: true

require 'base64'
require 'date'
require 'fileutils'
require 'kramdown'
require 'openssl'
require 'pathname'
require 'yaml'

ROOT = Pathname.new(__dir__).join('..').expand_path
PLAINTEXT_DIR = ROOT.join('secret_plain')
OUTPUT_DIR = ROOT.join('secret')
ITERATIONS = 210_000
KEY_LENGTH = 32
SALT_BYTES = 16
IV_BYTES = 12

def usage!
  warn 'Usage: bundle exec ruby scripts/encrypt_secret.rb <path/to/plaintext.md> [more files...]'
  exit 1
end

def read_front_matter(path)
  content = File.read(path)
  match = content.match(/\A---\s*\r?\n(.*?)\r?\n---\s*\r?\n?/m)
  raise "Missing front matter block in #{path}" unless match

  [match[1], match.post_match]
end

def sanitize_yaml_dump(hash)
  yaml = YAML.dump(hash)
  yaml.sub!(/\A---\s*\n?/, '')
  yaml.sub!(/\.\.\.\s*\n?\z/, '')
  yaml
end

def encrypt_file(source_path)
  front_matter_raw, markdown = read_front_matter(source_path)
  metadata = YAML.safe_load(front_matter_raw, permitted_classes: [Date, Time], aliases: true) || {}
  raise "Front matter must be a map in #{source_path}" unless metadata.is_a?(Hash)

  secret_key = metadata.delete('secret_key')
  raise "Missing `secret_key` in #{source_path}" if secret_key.to_s.strip.empty?

  html = Kramdown::Document.new(markdown).to_html

  salt = OpenSSL::Random.random_bytes(SALT_BYTES)
  iv = OpenSSL::Random.random_bytes(IV_BYTES)
  key = OpenSSL::PKCS5.pbkdf2_hmac(secret_key, salt, ITERATIONS, KEY_LENGTH, 'sha256')

  cipher = OpenSSL::Cipher.new('aes-256-gcm')
  cipher.encrypt
  cipher.key = key
  cipher.iv = iv
  cipher.auth_data = ''
  encrypted = cipher.update(html) + cipher.final
  tag = cipher.auth_tag

  metadata['layout'] = 'secret_post' unless metadata['layout']
  metadata['encrypted'] = true
  metadata['kdf'] = {
    'name' => 'PBKDF2',
    'hash' => 'SHA-256',
    'iterations' => ITERATIONS
  }
  metadata['salt'] = Base64.strict_encode64(salt)
  metadata['iv'] = Base64.strict_encode64(iv)
  metadata['tag'] = Base64.strict_encode64(tag)
  metadata['ciphertext'] = Base64.strict_encode64(encrypted)

  relative = Pathname.new(source_path).relative_path_from(ROOT)
  if relative.each_filename.first != 'secret_plain'
    raise "Expected #{source_path} to be inside secret_plain/"
  end

  dest_relative = relative.each_filename.to_a.tap { |parts| parts[0] = 'secret' }.join('/')
  dest_path = ROOT.join(dest_relative)
  FileUtils.mkdir_p(dest_path.dirname)

  yaml = sanitize_yaml_dump(metadata)
  File.write(dest_path, +"---\n#{yaml}---\n")
  puts "Encrypted #{relative} -> #{dest_relative}"
end

usage! if ARGV.empty?

ARGV.each do |path|
  source = ROOT.join(path).expand_path
  raise "File not found: #{path}" unless source.file?
  encrypt_file(source)
end
