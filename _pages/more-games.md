---
layout: games
permalink: /more/games/
title: games
collapsible_panels: true

---
{% assign games = site.games | sort: 'order' %}
{% for game in games %}
  <details class="collapsible-panel game-case">
    <summary>
      <h3>{{ game.title }}</h3>
      {% if game.summary %}
        <p>{{ game.summary }}</p>
      {% endif %}
    </summary>
    <div class="collapsible-panel__content">
      <div class="embed-responsive {{ game.aspect_ratio | default: 'embed-responsive-4by3' }}">
        {% assign element_tag = game.element_tag | default: 'div' %}
        <{{ element_tag }}
          {% if game.element_id %}id="{{ game.element_id }}"{% endif %}
          class="{{ game.element_class | default: 'embed-responsive-item' }}"
          {% if game.element_role %}role="{{ game.element_role }}"{% endif %}
          {% if game.element_aria_label %}aria-label="{{ game.element_aria_label }}"{% endif %}
        ></{{ element_tag }}>
      </div>
    </div>
  </details>
{% endfor %}

{% if games.size > 0 %}
  {% for game in games %}
    <script src="{{ game.url | relative_url | bust_file_cache }}" defer></script>
  {% endfor %}
{% endif %}
