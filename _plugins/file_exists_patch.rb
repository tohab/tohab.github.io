# _plugins/file_exists_patch.rb
# Compatibility patch for jekyll-scholar with Ruby 3.x

class File
    class << self
      alias_method :exists?, :exist? unless method_defined?(:exists?)
    end
  end