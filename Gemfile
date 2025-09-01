source "https://rubygems.org"

# Use Jekyll directly instead of github-pages gem for more control
gem "jekyll", "~> 3.10.0"

# Essential Jekyll plugins
gem "jekyll-scholar"
gem "jekyll-feed"

# Dependencies for custom plugins
gem "css_parser"        # download-3rd-party.rb
gem "feedjira"          # external-posts.rb  
gem "httparty"          # external-posts.rb
gem "nokogiri"          # external-posts.rb
gem "bibtex-ruby"       # likely needed for bibliography plugins
gem "citeproc-ruby"     # likely needed for citation processing
gem "csl-styles"        # likely needed for citation styles

# Markdown parser dependency
gem "kramdown-parser-gfm"
gem "jekyll-sitemap"
gem "jekyll-paginate-v2"
gem "jekyll-archives"
gem "jekyll-email-protect"
gem "jekyll-get-json"
gem "jekyll-imagemagick"
gem "jekyll-jupyter-notebook"
gem "jekyll-link-attributes"
gem "jekyll-minifier"
gem "jekyll-regex-replace"
gem "jekyll-tabs"
gem "jekyll-toc"
gem "jekyll-twitter-plugin"
gem "jemoji"

# Development dependencies
gem "webrick", "~> 1.7"

# Windows and JRuby support
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Lock wdm for Windows
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock http_parser.rb gem to v0.6.x on JRuby builds
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]