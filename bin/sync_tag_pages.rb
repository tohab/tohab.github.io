#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'fileutils'
require 'set'
require 'date'

ROOT = File.expand_path('..', __dir__)
POSTS_DIR = File.join(ROOT, '_posts')
TARGET_DIR = File.join(ROOT, '_generated', 'tag')
FRONT_MATTER_PATTERN = /\A---\s*\n(.*?)\n---\s*\n/m.freeze

FileUtils.mkdir_p(TARGET_DIR)

def slugify(name)
  name.downcase.strip.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')
end

# Collect tags across all posts
unique_tags = Dir.glob(File.join(POSTS_DIR, '**', '*.{md,markdown}')).each_with_object(Set.new) do |path, tags|
  next unless File.file?(path)

  content = File.read(path)
  match = FRONT_MATTER_PATTERN.match(content)
  next unless match

  metadata = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
  Array(metadata['tags']).each do |tag|
    cleaned = tag.to_s.strip
    tags << cleaned unless cleaned.empty?
  end
end

# Remove any previously generated files so obsolete tags disappear
Dir.glob(File.join(TARGET_DIR, '*.md')).each { |path| File.delete(path) }

unique_tags.to_a.sort.each do |tag|
  slug = slugify(tag)
  output_path = File.join(TARGET_DIR, "#{slug}.md")
  File.write(output_path, <<~CONTENT)
    ---
    layout: archive-tag
    title: #{tag}
    tag: #{tag}
    permalink: /blog/tag/#{slug}/
    ---
  CONTENT
end

puts "Generated #{unique_tags.size} tag page#{'s' unless unique_tags.size == 1} in #{TARGET_DIR}" if unique_tags.any?
