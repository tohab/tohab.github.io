---
layout: games
permalink: /etc/games/
title: games

---
{% assign games = site.games | sort: 'order' %}
{% if games.size > 0 %}
  <div class="games-grid">
    {% for game in games %}
      <article class="game-card">
        <a class="game-card__link" href="{{ game.url | replace: '.js', '/' | relative_url }}">
          {% assign game_slug = game.path | split: '/' | last | remove: '.js' %}
          {% assign default_preview = '/assets/img/games/' | append: game_slug | append: '.jpg' %}
          <img class="game-card__preview" src="{{ game.preview_image | default: default_preview | relative_url }}" alt="Screenshot of {{ game.title | escape }}" width="660" height="495" loading="lazy" decoding="async">
          <div class="game-card__footer">
            <div class="game-card__meta">
              <p class="game-card__eyebrow">play</p>
              <h2 class="game-card__title">{{ game.title }}</h2>
            </div>
            <span class="game-card__cta" aria-hidden="true">→</span>
          </div>
        </a>
      </article>
    {% endfor %}
  </div>
{% else %}
  <p class="text-muted">more prototypes are brewing.</p>
{% endif %}
