#!/usr/bin/env ruby
# frozen_string_literal: true

require 'date'
require 'digest'
require 'json'
require 'nokogiri'
require 'open3'
require 'pathname'
require 'set'
require 'uri'
require 'yaml'

class SiteCheck
  attr_reader :errors, :broken_links

  def initialize(destination, source: File.expand_path('..', __dir__))
    @destination = Pathname.new(destination).expand_path
    @source = Pathname.new(source).expand_path
    @errors = []
    @broken_links = Hash.new { |hash, key| hash[key] = Set.new }
    @scripts = {}
    config_path = @source.join('_config.yml')
    config = config_path.file? ? YAML.safe_load(config_path.read) : {}
    host = URI(config.fetch('url', 'https://site.invalid')).host.delete_prefix('www.')
    @hosts = Set['site.invalid', host, 'www.' + host]
  end

  def run
    %w[index.html blog/index.html blog/page/2/index.html music/index.html work/index.html rcg/index.html feed.xml sitemap.xml].each do |path|
      errors << "Missing required output: #{path}" unless @destination.join(path).file?
    end
    %w[bin scripts tests docs secret_plain requirements.txt Gemfile Gemfile.lock .ruby-version].each do |path|
      errors << "Development/private file in output: #{path}" if @destination.join(path).exist?
    end
    errors << 'Old Gemfile in output' if @destination.join('old Gemfile').exist?

    @destination.glob('**/*.html').each do |path|
      next if path.relative_path_from(@destination).to_s.start_with?('assets/')

      document = Nokogiri::HTML(path.read)
      route = '/' + path.relative_path_from(@destination).to_s.sub(/index\.html\z/, '')
      document.css('a[href], img[src], script[src], link[rel="stylesheet"][href], iframe[src]').each do |element|
        check_link(element['href'] || element['src'], route)
      end
      document.css('script:not([src])').each do |script|
        next unless ['', 'text/javascript', 'application/javascript', 'module'].include?(script['type'].to_s)
        code = script.content
        next if code.strip.empty?
        @scripts[Digest::SHA256.hexdigest(code)] ||= [code, route, script['type'] == 'module']
      end
    end

    broken_links.each do |target, routes|
      errors << "Missing internal target #{target} (from #{routes.to_a.first})"
    end
    check_javascript
    check_pagination
    check_encrypted_gallery
    errors.empty?
  end

  private

  def check_link(raw, route)
    return if raw.to_s.empty? || raw.start_with?('#')

    # URI only accepts ASCII, while older posts contain literal Unicode paths.
    escaped = raw.gsub(/[^\x21-\x7E]/) { |char| char.bytes.map { |byte| '%%%02X' % byte }.join }
    uri = URI.join('https://site.invalid' + route, escaped)
    return unless %w[http https].include?(uri.scheme) && @hosts.include?(uri.host)
    target = uri.path
    target = URI::DEFAULT_PARSER.unescape(target)
    file = @destination.join(target.delete_prefix('/')).cleanpath
    return if file.file? || file.join('index.html').file?

    @broken_links[target] << route
  rescue URI::InvalidURIError => e
    errors << "Invalid URL in #{route}: #{e.message}"
  end

  def check_javascript
    @scripts.each_value do |code, route, is_module|
      _stdout, stderr, status = Open3.capture3('node', '--check', "--input-type=#{is_module ? 'module' : 'commonjs'}", stdin_data: code)
      next if status.success?
      # Never print script contents: encrypted pages can contain large payloads.
      message = stderr.lines.find { |line| line.start_with?('SyntaxError:') }&.strip || 'syntax check failed'
      errors << "Inline JavaScript in #{route}: #{message}"
    end
  end

  def check_pagination
    path = @destination.join('blog/index.html')
    return unless path.file?
    blog = Nokogiri::HTML(path.read)
    config = YAML.safe_load(@source.join('_pages/blog.md').read.split(/^---\s*$/, 3)[1], permitted_classes: [Date, Time])
    expected = config.fetch('pagination').fetch('per_page')
    errors << "Blog should show #{expected} posts per page" unless blog.css('.post-list > li').length == expected
  end

  def check_encrypted_gallery
    source = @source.join('_pages/rcg.md')
    output = @destination.join('rcg/index.html')
    return unless source.file? && output.file?

    source_text = source.read
    metadata = YAML.safe_load(source_text.split(/^---\s*$/, 3)[1], permitted_classes: [Date, Time])
    data_element = Nokogiri::HTML(output.read).at_css('script#rcg-encrypted-data')
    unless data_element
      errors << 'RCG encrypted data element missing'
      return
    end
    actual = JSON.parse(data_element.content)
    source_element = Nokogiri::HTML(source_text).at_css('script#rcg-encrypted-data')
    expected = if source_element
                 JSON.parse(source_element.content)
               else
                 metadata.slice('salt', 'iv', 'ciphertext').merge('iterations' => metadata.fetch('kdf').fetch('iterations'))
               end
    required = %w[salt iv iterations ciphertext]
    unless (required - expected.keys).empty? && required.all? { |key| !expected[key].nil? }
      errors << 'RCG encrypted metadata is invalid'
      return
    end
    errors << 'RCG encrypted payload changed during build' unless actual == expected
    sitemap = @destination.join('sitemap.xml')
    errors << 'RCG must stay out of the sitemap' if sitemap.file? && Nokogiri::XML(sitemap.read).xpath('//*[local-name()="loc"]').any? { |loc| URI(loc.text).path == '/rcg/' }
  rescue JSON::ParserError, KeyError
    errors << 'RCG encrypted metadata is invalid'
  end
end

if $PROGRAM_NAME == __FILE__
  check = SiteCheck.new(ARGV.fetch(0, '_site'))
  if check.run
    puts "Site checks passed (including pagination, internal links, JavaScript syntax, and RCG payload preservation)."
  else
    warn check.errors.join("\n")
    exit 1
  end
end
