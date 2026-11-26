---
layout: resume
permalink: /resume/
title: resume
description: A focused snapshot of my recent experience and projects.
nav: false
giscus_comments: false
show_title: false
full_width: true
_styles: |
  #resume-preview {
    background: linear-gradient(150deg, #ffe9d5, #ffdaba);
    border: 2px solid rgba(184, 0, 0, 0.2);
    border-radius: 20px;
    box-shadow: 0 22px 60px rgba(63, 36, 7, 0.18);
    padding: 2.75rem 3.25rem;
    margin: 0 auto 2.5rem;
    color: var(--global-text-color);
    width: min(1200px, 100%);
  }

  #resume-preview > h1:first-child {
    font-size: clamp(2rem, 4vw, 2.75rem);
    margin-bottom: 0.25rem;
    text-align: center;
    color: #7a2411;
    letter-spacing: 0.01em;
    font-weight: 700;
  }

  #resume-preview > p:first-of-type {
    text-align: center;
    font-size: 0.98rem;
    color: #53230e;
    margin-bottom: 1.25rem;
  }

  #resume-preview h1,
  #resume-preview h2,
  #resume-preview h3 {
    font-weight: 700;
    color: #7a2411;
    letter-spacing: 0.01em;
  }

  #resume-preview h2 {
    font-size: 1.15rem;
    margin: 1.5rem 0 0.75rem;
    padding-bottom: 0.25rem;
    border-bottom: 2px solid rgba(122, 36, 17, 0.25);
  }

  #resume-preview .resume-major-title {
    font-size: clamp(1.5rem, 3vw, 1.8rem);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  #resume-preview h3 {
    font-size: 1.05rem;
    margin: 0;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1.25rem;
  }

  #resume-preview h3 .resume-dates {
    font-size: 1rem;
    color: #8d3b1d;
    font-weight: 600;
    white-space: nowrap;
  }

  #resume-preview .resume-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1.25rem;
    font-style: italic;
    color: #6b3415;
    margin: 0.2rem 0 0.8rem;
  }

  #resume-preview .resume-meta strong {
    font-style: normal;
    color: #5e1c06;
  }

  #resume-preview .resume-meta .resume-location {
    font-style: normal;
    color: rgba(25, 10, 3, 0.75);
    white-space: nowrap;
  }

  #resume-preview ul {
    padding-left: 1.1rem;
    margin: 0.4rem 0 0;
    color: #2f1d0c;
  }

  #resume-preview ul li {
    margin: 0.25rem 0;
  }

  #resume-preview strong {
    color: #5e1c06;
  }

  @media (max-width: 640px) {
    #resume-preview {
      padding: 2rem 1.4rem;
    }

    #resume-preview h3 {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.35rem;
    }

    #resume-preview h3 .resume-dates {
      align-self: flex-start;
    }

    #resume-preview .resume-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.15rem;
    }

    #resume-preview .resume-meta .resume-location {
      white-space: normal;
    }
  }

  @media print {
    #resume-preview {
      background: white;
      border-color: #000;
      box-shadow: none;
    }

    #resume-preview h1,
    #resume-preview h2,
    #resume-preview h3 {
      color: #000;
    }
  }
---

{% comment %}Content lives in _includes/resume_content.md (also shown on /work/).{% endcomment %}
{% capture resume %}{% include resume_content.md %}{% endcapture %}
{{ resume | markdownify }}
