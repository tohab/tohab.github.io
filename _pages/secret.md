---
layout: default
permalink: /secret/
title: secret
nav: false
---

<style>
  h3.post-title {
    font-size: 1.44rem;
  }

  .post-title a {
    font-weight: 400;
  }

  .post-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .post-list li {
    margin-bottom: 1.2rem;
  }

  .post-summary {
    margin: 0.2rem 0 0.35rem;
    font-size: 0.95rem;
    line-height: 1.5;
    color: rgba(0, 0, 0, 0.75);
  }

  .post-meta {
    font-size: 0.85rem;
    color: rgba(0, 0, 0, 0.65);
  }

  hr {
    margin: 0.5rem 0;
  }
</style>

{% assign secret_posts = site.pages | where_exp: "p", "p.path contains 'secret/'" %}
{% assign secret_posts = secret_posts | sort: 'date' | reverse %}

<div class="post">
  <div class="banner-container" style="position: relative; text-align: left;">
    <img src="{{ '/assets/img/blog-banner.png' | relative_url }}" alt="Secret Banner" style="width: 100%; height: auto; opacity: 0.75;">
    <div style="
      position: absolute;
      top: 70%;
      left: 18%;
      transform: translate(-18%, -70%);
      color: black;
      opacity: 1;
      margin: 0;">
      <h2 style="font-size: 2.7rem; font-weight: 700; margin: 0;">secret</h2>
      <p style="font-size: 1rem; font-weight: 400; letter-spacing: 0.08rem; text-transform: uppercase; margin: 0.25rem 0 0;">
        hidden dispatches
      </p>
    </div>
  </div>

  <div class="blog-main" style="margin-top: 1.5rem;">
    {% if secret_posts.size > 0 %}
      <ul class="post-list">
        {% for post in secret_posts %}
          {% assign read_time = post.content | strip_html | number_of_words | divided_by: 180 | plus: 1 %}
          <li>
            <h3 class="post-title">
              {% if post.redirect == blank %}
                <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
              {% elsif post.redirect contains '://' %}
                <a href="{{ post.redirect }}" target="_blank">{{ post.title }}</a>
              {% else %}
                <a href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
              {% endif %}
            </h3>

            {% if post.description %}
              <p class="post-summary">{{ post.description }}</p>
            {% endif %}
            <p class="post-meta">
              {{ read_time }} min read &nbsp; &middot; &nbsp; {{ post.date | date: '%B %d, %Y' }}
            </p>
            <hr>
          </li>
        {% endfor %}
      </ul>
    {% else %}
      <p>No secret posts yet. Check back soon.</p>
    {% endif %}
  </div>
</div>
