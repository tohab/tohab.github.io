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
          <div class="game-card__meta">
            <p class="game-card__eyebrow">play</p>
            <h2 class="game-card__title">{{ game.title }}</h2>
          </div>
          <span class="game-card__cta" aria-hidden="true">→</span>
        </a>
      </article>
    {% endfor %}
  </div>
{% else %}
  <p class="text-muted">more prototypes are brewing.</p>
{% endif %}
