# frozen_string_literal: true

module Jekyll
  module AutoDescription
    MAX_LENGTH = 180

    module_function

    def update(post)
      site = post.site
      return unless site && post.respond_to?(:content)

      converter = site.find_converter_instance(Jekyll::Converters::Markdown)
      text = first_text_block(post.content, converter)
      return unless text

      sentence = first_sentence(text)
      return if sentence.empty?

      post.data['description'] = truncate(sentence)
    rescue StandardError => e
      Jekyll.logger.debug("auto_description", "Skipped #{post.data['title']}: #{e.message}")
    end

    def first_text_block(content, converter)
      return nil if content.to_s.strip.empty?

      content.split(/\r?\n\r?\n+/).each do |raw_paragraph|
        paragraph = raw_paragraph.strip
        next if paragraph.empty?

        html = converter.convert(paragraph)
        stripped_html = html.strip

        next if heading_block?(stripped_html)
        next if italic_block?(stripped_html)
        next if image_block?(stripped_html)

        text = Jekyll::Utils.strip_html(html)
        text = text.gsub(/\s+/, ' ').strip
        next if text.empty?

        return text
      end

      nil
    end

    def heading_block?(html)
      html.start_with?('<h1', '<h2', '<h3', '<h4', '<h5', '<h6')
    end

    def italic_block?(html)
      html.match?(%r{\A<p><(em|i)>}i) && html.match?(%r{</(em|i)></p>\z}i)
    end

    def image_block?(html)
      (html.include?('<img') || html.include?('<figure')) && Jekyll::Utils.strip_html(html).strip.empty?
    end

    def first_sentence(text)
      match = text.match(/(.+?[\.\?!])(?=\s|$)/)
      (match ? match[1] : text).to_s.strip
    end

    def truncate(sentence)
      return sentence if sentence.length <= MAX_LENGTH

      trimmed = sentence[0, MAX_LENGTH]
      if (cut = trimmed.rindex(' ')) && cut > (MAX_LENGTH * 0.6)
        trimmed = trimmed[0, cut]
      end
      trimmed.rstrip << '...'
    end
  end

  Hooks.register :posts, :pre_render do |post, _payload|
    AutoDescription.update(post)
  end
end
