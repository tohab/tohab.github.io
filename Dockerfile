FROM ruby:3.4.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential imagemagick libffi-dev libyaml-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv/jekyll
COPY Gemfile Gemfile.lock ./
RUN bundle config set frozen true && bundle install
COPY . .

ENV JEKYLL_ENV=development
EXPOSE 8080 35729
CMD ["bash", "bin/entry_point.sh"]
