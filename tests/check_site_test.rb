# frozen_string_literal: true

require 'fileutils'
require 'tmpdir'
require 'jekyll'
require_relative '../scripts/check_site'
require_relative '../_plugins/validate_output'
require_relative '../_plugins/auto_description'

# Exercise the failure cases as well as the happy path without network requests.
def assert(condition, message)
  raise message unless condition
end

item_class = Struct.new(:path, :target) do
  def destination(_destination)
    target
  end
end
site_class = Struct.new(:dest, :items) do
  def each_site_file(&block)
    items.each(&block)
  end
end
site = site_class.new('/output', [item_class.new('one.md', '/output/work/index.html')])
Jekyll::OutputGuard.validate!(site)
site.items << item_class.new('two.md', '/output/work/index.html')
begin
  Jekyll::OutputGuard.validate!(site)
  raise 'Duplicate output must fail'
rescue Jekyll::Errors::FatalException => e
  assert(e.message.include?('one.md') && e.message.include?('two.md'), 'Collision must identify both sources')
end

converter = Object.new
def converter.convert(markdown)
  Kramdown::Document.new(markdown).to_html
end
description_site = Struct.new(:converter) do
  def find_converter_instance(_type)
    converter
  end
end.new(converter)
post = Struct.new(:site, :content, :data).new(description_site, 'First sentence. Second sentence.', { 'description' => 'Author supplied summary' })
Jekyll::AutoDescription.update(post)
assert(post.data['description'] == 'Author supplied summary', 'Custom plugin must preserve authored summaries')
post.data['description'] = nil
Jekyll::AutoDescription.update(post)
assert(post.data['description'] == 'First sentence.', 'Custom plugin must generate a missing summary')

Dir.mktmpdir('site-check') do |root|
  source = File.join(root, 'source')
  output = File.join(root, 'output')
  FileUtils.mkdir_p(File.join(source, '_pages'))
  File.write(File.join(source, '_pages/blog.md'), "---\npagination:\n  per_page: 1\n---\n")
  File.write(File.join(source, '_pages/rcg.md'), "---\nsalt: salt\niv: iv\nciphertext: opaque\nkdf:\n  iterations: 600000\n---\n")
  %w[index.html blog/index.html blog/page/2/index.html music/index.html work/index.html rcg/index.html feed.xml sitemap.xml].each do |path|
    FileUtils.mkdir_p(File.dirname(File.join(output, path)))
    File.write(File.join(output, path), '<html></html>')
  end
  File.write(File.join(output, 'sitemap.xml'), '<urlset></urlset>')
  File.write(File.join(output, 'blog/index.html'), '<ul class="post-list"><li>post</li></ul><a href="/blog/page/2/">next</a>')
  gallery = '<script id="rcg-encrypted-data" type="application/json">{"salt":"salt","iv":"iv","ciphertext":"opaque","iterations":600000}</script>'
  File.write(File.join(output, 'rcg/index.html'), gallery)
  check = -> { SiteCheck.new(output, source: source) }
  assert(check.call.run, 'Valid site should pass')

  File.write(File.join(output, 'index.html'), '<a href="/missing/">broken</a>')
  result = check.call
  assert(!result.run && result.errors.any? { |error| error.include?('Missing internal target /missing/') }, 'Missing internal target must fail')

  File.write(File.join(output, 'index.html'), '<a href="https://site.invalid/missing/">absolute internal link</a>')
  assert(!check.call.run, 'Absolute same-host links must also be checked')
  File.write(File.join(output, 'index.html'), '<a href="https://external.invalid/unavailable/">external</a>')
  assert(check.call.run, 'External requests must not be part of offline release checks')

  File.write(File.join(output, 'index.html'), '<script src="/missing.js"></script>')
  assert(!check.call.run, 'Missing JavaScript asset must fail')
  File.write(File.join(output, 'index.html'), '<script>const = ;</script>')
  result = check.call
  assert(!result.run && result.errors.any? { |error| error.include?('Inline JavaScript') }, 'Invalid JavaScript must fail')
  File.write(File.join(output, 'index.html'), '<script>const answer = 42;</script>')
  assert(check.call.run, 'Valid JavaScript should pass')

  File.write(File.join(output, 'rcg/index.html'), gallery.sub('opaque', 'changed'))
  result = check.call
  assert(!result.run && result.errors.include?('RCG encrypted payload changed during build'), 'Changed RCG ciphertext must fail')
  File.write(File.join(output, 'rcg/index.html'), gallery)
  inline_gallery = gallery.sub('"iterations":600000', '"iterations":600000,"compression":"gzip"')
  File.write(File.join(source, '_pages/rcg.md'), "---\nlayout: page\nsitemap: false\n---\n" + inline_gallery)
  File.write(File.join(output, 'rcg/index.html'), inline_gallery)
  assert(check.call.run, 'Inline encrypted payload must be preserved for the current RCG page')
  File.write(File.join(output, 'rcg/index.html'), inline_gallery.sub('gzip', 'changed'))
  result = check.call
  assert(!result.run && result.errors.include?('RCG encrypted payload changed during build'), 'Inline payload compression metadata must be preserved')
  File.write(File.join(output, 'rcg/index.html'), inline_gallery)
  FileUtils.mkdir_p(File.join(output, 'secret_plain'))
  result = check.call
  assert(!result.run && result.errors.any? { |error| error.include?('secret_plain') }, 'Private draft directory must fail')
  FileUtils.rm_r(File.join(output, 'secret_plain'))

  File.write(File.join(output, 'blog/index.html'), '<ul class="post-list"></ul>')
  result = check.call
  assert(!result.run && result.errors.any? { |error| error.include?('posts per page') }, 'Disabled pagination must fail')
end

puts 'Build tests passed (duplicate outputs, authored/generated summaries, valid output, links/assets, JavaScript, RCG preservation, private files, pagination).'
