---
layout: default
permalink: /blog/
title: blog
nav: true
nav_order: 1
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 8
  sort_field: date
  sort_reverse: true
  trail:
    before: 2
    after: 2
---

<style>
  h3.post-title {
    font-size: 1.2rem;
  }
  .post-title a {
    font-weight: 400;
  }
  .post-tags,
  .sidebar .post-tags a {
    font-size: 0.9rem;
  }

  hr {
    margin: 0.05rem 0; /* Adjust to taste */
  }

  .post-list li p {
     margin: 0.0rem 0rem; /* Tighten paragraph spacing within list items */
  }

  .post-tags a {
    white-space: nowrap;
  }

  .blog-layout {
    display: flex;
    gap: 2.5rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .blog-main {
    flex: 0 0 66.666%;
    max-width: 66.666%;
    min-width: 20rem;
  }

  .blog-sidebar {
    flex: 0 0 33.333%;
    max-width: 33.333%;
    min-width: 14rem;
  }

  @media (max-width: 992px) {
    .blog-layout {
      flex-direction: column;
      gap: 1.5rem;
    }

    .blog-main,
    .blog-sidebar {
      flex: 1 1 auto;
      max-width: none;
      width: 100%;
    }
  }
</style>

<div class="post">
  <div class="banner-container" style="position: relative; text-align: left;">
    <img src="{{ '/assets/img/blog-banner.png' | relative_url }}" alt="Blog Banner" style="width: 100%; height: auto; opacity: 0.75;">
    <h2 style="
      position: absolute;
      top: 75%;
      left: 20%;
      transform: translate(-20%, -75%);
      color: black;
      opacity: 1.00;
      font-size: 2.5rem;
      font-weight: bold;
      margin: 0;">
      {{ site.blog_name }}
    </h2>
  </div>

  {% assign blog_name_size = site.blog_name | size %}
  {% assign blog_description_size = site.blog_description | size %}

  {% if blog_name_size > 0 or blog_description_size > 0 %}
    <!--
    <div class="header-bar"> 
      <h2>{{ site.blog_name }}</h2>
      <h3>{{ site.blog_description }}</h3>
    </div>
    -->
  {% endif %}

  <div class="blog-layout">
    <div class="blog-main">
      {% if paginator and paginator.posts %}
        {% assign postlist = paginator.posts %}
      {% elsif page.pagination and page.pagination.enabled %}
        {%- comment -%}
          Pagination is enabled in front matter but the paginator object is unavailable
          (e.g., when the plugin is disabled). Fall back to all posts to keep content visible.
        {%- endcomment -%}
        {% assign postlist = site.posts | sort: 'date' | reverse %}
      {% else %}
        {% assign postlist = site.posts | sort: 'date' | reverse %}
      {% endif %}

      {% assign featured_posts = site.posts | where: "featured", "true" | sort: 'date' | reverse %}
      {% if featured_posts.size > 0 %}
      <br>
      <div class="container featured-posts">
        {% assign is_even = featured_posts.size | modulo: 2 %}
        <div class="row row-cols-{% if featured_posts.size <= 2 or is_even == 0 %}2{% else %}3{% endif %}">
          {% for post in featured_posts %}
            <div class="col mb-4">
              <a href="{{ post.url | relative_url }}">
                <div class="card hoverable">
                  <div class="row g-0">
                    <div class="col-md-12">
                      <div class="card-body">
                        <div class="float-right">
                          <i class="fa-solid fa-thumbtack fa-xs"></i>
                        </div>
                        <h4 class="card-title text-lowercase">{{ post.title }}</h4>
                        <p class="card-text">{{ post.description }}</p>
                        {% if post.external_source == blank %}
                          {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
                        {% else %}
                          {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
                        {% endif %}
                        {% assign year = post.date | date: "%Y" %}
                        <p class="post-meta">
                          {{ read_time }} min read &nbsp; &middot; &nbsp;
                          <!-- <a href="{{ year | prepend: '/blog/' | prepend: site.baseurl}}">
                            <i class="fa-solid fa-calendar fa-sm"></i> {{ year }}
                          </a> -->
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          {% endfor %}
        </div>
      </div>
      <hr style="margin: 0.3rem 0;">
      {% endif %}

      <ul class="post-list">
        {% for post in postlist %}
          {% if post.external_source == blank %}
            {% assign read_time = post.content | number_of_words | divided_by: 180 | plus: 1 %}
          {% else %}
            {% assign read_time = post.feed_content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
          {% endif %}
          <!-- {% assign year = post.date | date: "%Y" %} -->
          <!-- {% assign tags = post.tags | join: "" %} -->
          {% assign categories = post.categories | join: "" %}

          <li>
            {% if post.thumbnail %}
            <div class="row">
              <div class="col-sm-9">
            {% endif %}
                <h3 class="post-title">
                  {% if post.redirect == blank %}
                    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
                  {% elsif post.redirect contains '://' %}
                    <a href="{{ post.redirect }}" target="_blank">{{ post.title }}</a>
                    <svg width="2rem" height="2rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path>
                    </svg>
                  {% else %}
                    <a href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
                  {% endif %}
                </h3>

                <p>{{ post.description }}</p>
                <p class="post-meta">
                  {{ read_time }} min read &nbsp; &middot; &nbsp;
                  {{ post.date | date: '%B %d, %Y' }}
                  {% if post.external_source %}
                  &nbsp; &middot; &nbsp; {{ post.external_source }}
                  {% endif %}
                </p>

                <p class="post-tags">
                  <!-- <a href="{{ year | prepend: '/blog/' | prepend: site.baseurl}}"> -->
                    <!-- <i class="fa-solid fa-calendar fa-sm"></i> {{ year }} -->
                  <!-- </a> -->

                  <!-- {% if tags != "" %}
                    &nbsp; &middot; &nbsp;
                    {% for tag in post.tags %}
                      <a href="{{ tag | slugify | prepend: '/blog/tag/' | prepend: site.baseurl}}">
                        <i class="fa-solid fa-hashtag fa-sm"></i> {{ tag }}
                      </a>
                      {% unless forloop.last %}
                        &nbsp; &middot; &nbsp;
                      {% endunless %}
                    {% endfor %}
                  {% endif %}  -->

                  {% if categories != "" %}
                    &nbsp; &middot; &nbsp;
                    {% for category in post.categories %}
                      <a href="{{ category | slugify | prepend: '/blog/category/' | prepend: site.baseurl}}">
                        <i class="fa-solid fa-tag fa-sm"></i> {{ category }}
                      </a>
                      {% unless forloop.last %}
                        &nbsp; &middot; &nbsp;
                      {% endunless %}
                    {% endfor %}
                  {% endif %} 
                </p>
            {% if post.thumbnail %}
              </div>
              <div class="col-sm-3">
                <img class="card-img" src="{{ post.thumbnail | relative_url }}" style="object-fit: cover; height: 90%;" alt="image">
              </div>
            </div>
            {% endif %}
          </li>
        {% endfor %}
      </ul>

      {% if paginator and page.pagination and page.pagination.enabled %}
        {% include pagination.liquid %}
      {% endif %}
    </div>

    <aside class="blog-sidebar">
      <div class="sidebar">

        <h6 style="margin-top: 1rem; margin-bottom: 0.5rem;">archives</h6>
        <div style="font-size: 0.9rem;">
          {% assign all_dates = site.posts | map: 'date' %}
          {% assign all_years = "" | split: "" %}
          {% for d in all_dates %}
            {% assign y = d | date: "%Y" %}
            {% unless all_years contains y %}
              {% assign all_years = all_years | push: y %}
            {% endunless %}
          {% endfor %}
          {% assign sorted_years = all_years | sort: "numeric" | reverse %}
          {% for y in sorted_years %}
            {% if y >= '2019' and y <= '2025' %}
              <a href="{{ '/blog/' | append: y | relative_url }}">
                {{ y }}
              </a>
              {% unless forloop.last %}
                &nbsp; &middot; &nbsp;
              {% endunless %}
            {% endif %}
          {% endfor %}
        </div>
        <p></p>
        
        <hr>

        <h6 style="margin-top: 1rem; margin-bottom: 0.5rem;">tags</h6>
        <div class="post-tags">
          {% for tag in site.display_tags %}
            <a href="{{ tag | slugify | prepend: '/blog/tag/' | relative_url }}">
              <i class="fa-solid fa-hashtag fa-sm"></i> {{ tag }}
            </a>
            {% unless forloop.last %}
              &nbsp; &middot; &nbsp;
            {% endunless %}
          {% endfor %}
        </div>
      </div>
    </aside>
  </div>
</div>
