# frozen_string_literal: true

module Jekyll
  module OutputGuard
    def self.validate!(site)
      destinations = Hash.new { |hash, key| hash[key] = [] }
      site.each_site_file do |item|
        destinations[item.destination(site.dest)] << item.path
      end
      collisions = destinations.select { |_destination, sources| sources.length > 1 }
      return if collisions.empty?

      details = collisions.map { |destination, sources| "#{destination}: #{sources.join(', ')}" }.join("\n")
      raise Jekyll::Errors::FatalException, "Multiple sources claim the same output:\n#{details}"
    end
  end
end

Jekyll::Hooks.register :site, :post_render do |site|
  Jekyll::OutputGuard.validate!(site)
end
