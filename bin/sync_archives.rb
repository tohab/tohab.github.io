#!/usr/bin/env ruby
# frozen_string_literal: true

require 'yaml'
require 'fileutils'
require 'set'
require 'date'

ROOT = File.expand_path('..', __dir__)
POSTS_DIR = File.join(ROOT, '_posts')
TAG_DIR = File.join(ROOT, '_generated', 'tag')
YEAR_DIR = File.join(ROOT, '_generated', 'year')
FRONT_MATTER_PATTERN = /\A---\s*\n(.*?)\n---\s*\n/m.freeze

[TAG_DIR, YEAR_DIR].each { |path| FileUtils.mkdir_p(path) }

def slugify(name)
  name.downcase.strip.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, '')
end

# Collect tags and years across all posts
unique_tags = Set.new
unique_years = Set.new

Dir.glob(File.join(POSTS_DIR, '**', '*.{md,markdown}')).each do |path|
  next unless File.file?(path)

  content = File.read(path)
  match = FRONT_MATTER_PATTERN.match(content)
  next unless match

  metadata = YAML.safe_load(match[1], permitted_classes: [Date, Time], aliases: true) || {}
  Array(metadata['tags']).each do |tag|
    cleaned = tag.to_s.strip
    unique_tags << cleaned unless cleaned.empty?
  end

  post_date = metadata['date']
  post_date = Date.parse(post_date.to_s) if post_date && !post_date.is_a?(Date)
  post_date ||= Time.now
  year_value = post_date.strftime('%Y')
  unique_years << year_value
end

# Remove any previously generated files so obsolete tags disappear
Dir.glob(File.join(TAG_DIR, '*.md')).each { |path| File.delete(path) }
Dir.glob(File.join(YEAR_DIR, '*.md')).each { |path| File.delete(path) }

unique_tags.to_a.sort.each do |tag|
  slug = slugify(tag)
  output_path = File.join(TAG_DIR, "#{slug}.md")
  File.write(output_path, <<~CONTENT)
    ---
    layout: archive-tag
    title: #{tag}
    tag: #{tag}
    permalink: /blog/tag/#{slug}/
    ---
  CONTENT
end

unique_years.to_a.sort.each do |year|
  output_path = File.join(YEAR_DIR, "#{year}.md")
  File.write(output_path, <<~CONTENT)
    ---
    layout: archive-year
    title: #{year}
    year: "#{year}"
    permalink: /blog/#{year}/
    ---
  CONTENT
end

puts "Generated #{unique_tags.size} tag page#{'s' unless unique_tags.size == 1} in #{TAG_DIR}" if unique_tags.any?
puts "Generated #{unique_years.size} year page#{'s' unless unique_years.size == 1} in #{YEAR_DIR}" if unique_years.any?
