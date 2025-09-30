#!/usr/bin/env python3
"""Generate blog statistics charts for the site."""
from __future__ import annotations

import math
import random
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Sequence, Tuple

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
POSTS_DIR = ROOT / '_posts'
OUTPUT_DIR = ROOT / 'assets' / 'img' / 'blog-stats'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = ImageFont.truetype('DejaVuSans.ttf', 28)
FONT_SMALL = ImageFont.truetype('DejaVuSans.ttf', 22)
FONT_TINY = ImageFont.truetype('DejaVuSans.ttf', 18)
FONT_TITLE = ImageFont.truetype('DejaVuSans.ttf', 40)

STOP_WORDS = {
    'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'between', 'both', 'but', 'by',
    'can', 'could',
    'did', 'do', 'does', 'doing', 'down', 'during',
    'each',
    'few', 'for', 'from', 'further',
    'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how',
    'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
    'just',
    'me', 'more', 'most', 'my', 'myself',
    'no', 'nor', 'not',
    'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over',
    'own',
    'same', 'she', 'should', 'so', 'some', 'such',
    'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these',
    'they', 'this', 'those', 'through', 'to', 'too',
    'under', 'until', 'up',
    'very',
    'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
    'would',
    'you', 'your', 'yours', 'yourself', 'yourselves',
    'http', 'https', 'www', 'com', 'blog', 'blogger', 'posted', 'post', 'originally', 'img',
    'googleusercontent'
}

COMMON_ENGLISH_WORDS = {
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on',
    'with', 'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we',
    'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their',
    'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make',
    'can', 'like', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good',
    'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its',
    'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well',
    'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'am',
    'been', 'much', 'many', 'might', 'those', 'should', 'still', 'around', 'down', 'may', 'such',
    'own', 'made', 'found', 'called', 'between', 'while', 'another', 'part', 'every', 'same', 'few',
    'through', 'thought', 'last', 'next', 'better', 'where', 'against', 'never', 'long', 'small',
    'large', 'right', 'left', 'again', 'always', 'things', 'under', 'home', 'why', 'each', 'thing',
    'since', 'place', 'where', 'during', 'money', 'life', 'most', 'world', 'week', 'years', 'keep',
    'house', 'point', 'number', 'group', 'name', 'family', 'however', 'old', 'state', 'great',
    'before', 'men', 'women', 'same', 'old', 'high', 'something', 'school', 'never', 'both',
    'between', 'feel', 'seem', 'city', 'story', 'book', 'today', 'later', 'using', 'enough',
    'probably', 'maybe', 'sort', 'kind', 'ever', 'though', 'ever', 'rather', 'already', 'yet',
    'once', 'during', 'often', 'almost', 'together', 'without', 'across', 'important', 'while',
    'next', 'early', 'side', 'quite', 'talk', 'set', 'found', 'took', 'nothing', 'end', 'start',
    'asked', 'felt', 'need', 'able', 'place', 'something', 'someone', 'feel', 'trying', 'things',
    'little', 'lot', 'makes', 'going', 'done', 'having', 'pretty', 'stuff', 'maybe', 'kind', 'sort',
    'around', 'actually', 'today', 'tomorrow', 'yesterday', 'better', 'wrote', 'seen', 'told',
    'until', 'while', 'mean', 'ever', 'almost', 'went', 'saw', 'felt', 'really', 'through', 'keep'
}

STOP_WORDS.update(COMMON_ENGLISH_WORDS)


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> Tuple[int, int]:
    bbox = draw.textbbox((0, 0), text, font=font)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    return width, height


@dataclass
class PostMetrics:
    path: Path
    date: datetime
    word_count: int
    words: List[str]


def iter_posts(posts_dir: Path) -> Iterable[PostMetrics]:
    for path in sorted(posts_dir.glob('*.md')):
        match = re.match(r'(\d{4}-\d{2}-\d{2})', path.name)
        if not match:
            continue
        text = path.read_text(encoding='utf-8')
        # Strip front matter if present
        content = text
        if text.startswith('---'):
            parts = text.split('---', 2)
            if len(parts) >= 3:
                content = parts[2]
        words = re.findall(r"[A-Za-z']+", content.lower())
        date = datetime.strptime(match.group(1), '%Y-%m-%d')
        yield PostMetrics(path=path, date=date, word_count=len(words), words=words)


def quarter_start(date: datetime) -> datetime:
    month = ((date.month - 1) // 3) * 3 + 1
    return date.replace(day=1, month=month)


def add_quarter(date: datetime) -> datetime:
    month = date.month + 3
    year = date.year + (month - 1) // 12
    month = ((month - 1) % 12) + 1
    return date.replace(year=year, month=month)


def build_quarter_series(posts: Sequence[PostMetrics]) -> Tuple[List[datetime], List[int], List[float]]:
    quarterly_counts: Dict[datetime, int] = defaultdict(int)
    for post in posts:
        start = quarter_start(post.date)
        quarterly_counts[start] += post.word_count
    if not quarterly_counts:
        return [], [], []
    quarters: List[datetime] = []
    counts: List[int] = []
    current = min(quarterly_counts)
    end = max(quarterly_counts)
    while current <= end:
        quarters.append(current)
        counts.append(quarterly_counts.get(current, 0))
        current = add_quarter(current)
    cumulative: List[float] = []
    total = 0
    for idx, value in enumerate(counts, start=1):
        total += value
        cumulative.append(total / idx)
    return quarters, counts, cumulative


def compute_histogram_bins(word_counts: Sequence[int]) -> Tuple[List[int], List[int]]:
    if not word_counts:
        return [], []
    sorted_counts = sorted(word_counts)
    n = len(sorted_counts)
    q1 = sorted_counts[int(0.25 * (n - 1))]
    q3 = sorted_counts[int(0.75 * (n - 1))]
    iqr = max(q3 - q1, 1)
    bin_width = max(int(round(2 * iqr / (n ** (1 / 3)))), 50)
    min_wc = min(sorted_counts)
    max_wc = max(sorted_counts)
    start = (min_wc // bin_width) * bin_width
    bins = []
    edges = []
    edge = start
    while edge <= max_wc + bin_width:
        edges.append(edge)
        edge += bin_width
    for idx in range(len(edges) - 1):
        lo = edges[idx]
        hi = edges[idx + 1]
        count = sum(1 for wc in word_counts if lo <= wc < hi)
        if idx == len(edges) - 2:
            count = sum(1 for wc in word_counts if lo <= wc <= hi)
        bins.append(count)
    return edges, bins


def aggregate_word_frequencies(posts: Sequence[PostMetrics]) -> Counter:
    counter: Counter = Counter()
    for post in posts:
        for word in post.words:
            if word in STOP_WORDS or len(word) <= 2:
                continue
            counter[word] += 1
    return counter


def draw_axes(draw: ImageDraw.ImageDraw, box: Tuple[int, int, int, int],
              x_ticks: Sequence[Tuple[float, str]], y_ticks: Sequence[Tuple[float, str]],
              *, grid: bool = True, grid_color: str = '#EEEEEE') -> None:
    left, top, right, bottom = box
    draw.line([(left, top), (left, bottom), (right, bottom)], fill='#333333', width=2)
    for x_pos, label in x_ticks:
        draw.line([(x_pos, bottom), (x_pos, bottom + 8)], fill='#333333', width=2)
        w, _ = measure_text(draw, label, FONT_SMALL)
        draw.text((x_pos - w / 2, bottom + 12), label, fill='#333333', font=FONT_SMALL)
    for y_pos, label in y_ticks:
        draw.line([(left - 8, y_pos), (left, y_pos)], fill='#333333', width=2)
        w, _ = measure_text(draw, label, FONT_SMALL)
        draw.text((left - 12 - w, y_pos - 12),
                  label, fill='#333333', font=FONT_SMALL)
        if grid:
            draw.line([(left, y_pos), (right, y_pos)], fill=grid_color, width=1)


def render_quarterly_chart(quarters: Sequence[datetime], counts: Sequence[int], cumulative: Sequence[float]) -> Path:
    if not quarters:
        raise ValueError('No quarterly data to chart')
    width, height = 1400, 900
    margin = {'left': 140, 'right': 120, 'top': 160, 'bottom': 160}
    background_color = '#f9f7f4'
    img = Image.new('RGB', (width, height), color=background_color)
    draw = ImageDraw.Draw(img)

    title_color = '#00369f'
    subtitle_color = '#4f5257'
    bar_color = '#0076df'
    line_color = '#f29105'
    grid_color = '#d9d4cc'

    draw.text((margin['left'], 50), 'Quarterly Word Count & Cumulative Average', fill=title_color, font=FONT_TITLE)
    draw.text((margin['left'], 110), 'Words are aggregated per calendar quarter; the line shows the running average since launch.',
              fill=subtitle_color, font=FONT_SMALL)

    plot_left = margin['left']
    plot_top = margin['top']
    plot_right = width - margin['right']
    plot_bottom = height - margin['bottom']

    max_count = max(max(counts), max(cumulative))
    y_max = math.ceil(max_count / 200.0) * 200 if max_count > 0 else 200

    x_positions = []
    quarter_labels = []
    total_quarters = len(quarters)
    for idx, quarter in enumerate(quarters):
        x = plot_left + idx * (plot_right - plot_left) / max(total_quarters - 1, 1)
        x_positions.append(x)
        q_num = (quarter.month - 1) // 3 + 1
        if q_num == 1 or idx in {0, total_quarters - 1} or (quarter.year % 2 == 1 and q_num == 3):
            label = f"Q{q_num} {quarter.year}"
            quarter_labels.append((x, label))

    y_ticks = []
    num_ticks = 5
    for i in range(num_ticks + 1):
        value = y_max * i / num_ticks
        y = plot_bottom - (plot_bottom - plot_top) * (value / y_max if y_max else 0)
        y_ticks.append((y, f"{int(value):,}"))

    draw_axes(draw, (plot_left, plot_top, plot_right, plot_bottom), quarter_labels, y_ticks, grid_color=grid_color)

    bar_width = min(60, (plot_right - plot_left) / max(total_quarters, 1) * 0.6)
    for x, value in zip(x_positions, counts):
        bar_left = x - bar_width / 2
        bar_right = x + bar_width / 2
        y = plot_bottom - (plot_bottom - plot_top) * (value / y_max if y_max else 0)
        draw.rounded_rectangle([bar_left, y, bar_right, plot_bottom], radius=8, fill=bar_color)

    line_points = []
    for x, value in zip(x_positions, cumulative):
        y = plot_bottom - (plot_bottom - plot_top) * (value / y_max if y_max else 0)
        line_points.append((x, y))
    if len(line_points) > 1:
        draw.line(line_points, fill=line_color, width=5, joint='curve')

    for point in line_points:
        draw.ellipse([point[0] - 5, point[1] - 5, point[0] + 5, point[1] + 5], fill=line_color)

    legend_width = 320
    legend_height = 110
    legend_x = plot_right - legend_width
    legend_y = margin['top'] - legend_height - 20
    legend_box = [legend_x, legend_y, legend_x + legend_width, legend_y + legend_height]
    draw.rounded_rectangle(legend_box, radius=12, fill='#ffffff', outline=grid_color, width=2)
    swatch_x = legend_x + 24
    swatch_y = legend_y + 20
    draw.rounded_rectangle([swatch_x, swatch_y, swatch_x + 30, swatch_y + 30], radius=6, fill=bar_color)
    draw.text((swatch_x + 40, swatch_y + 5), 'Words per quarter', font=FONT_SMALL, fill='#1c1c1d')
    line_y = swatch_y + 60
    draw.line([(swatch_x, line_y + 15), (swatch_x + 60, line_y + 15)], fill=line_color, width=5)
    draw.ellipse([swatch_x + 55 - 5, line_y + 15 - 5, swatch_x + 55 + 5, line_y + 15 + 5], fill=line_color)
    draw.text((swatch_x + 80, line_y), 'Cumulative average', font=FONT_SMALL, fill='#1c1c1d')

    output_path = OUTPUT_DIR / 'quarterly-words.png'
    img.save(output_path, format='PNG')
    return output_path


def render_histogram(edges: Sequence[int], counts: Sequence[int]) -> Path:
    if not edges or not counts:
        raise ValueError('No histogram data to chart')
    width, height = 1400, 900
    margin = {'left': 160, 'right': 120, 'top': 150, 'bottom': 160}
    background_color = '#f9f7f4'
    grid_color = '#d9d4cc'
    img = Image.new('RGB', (width, height), color=background_color)
    draw = ImageDraw.Draw(img)
    draw.text((margin['left'], 50), 'Distribution of Post Lengths', fill='#00369f', font=FONT_TITLE)
    draw.text((margin['left'], 110), 'Histogram of words per post across the archive.', fill='#4f5257', font=FONT_SMALL)

    plot_left = margin['left']
    plot_top = margin['top']
    plot_right = width - margin['right']
    plot_bottom = height - margin['bottom']

    max_count = max(counts)
    y_max = max_count if max_count > 5 else 5

    x_ticks = []
    num_ticks = min(6, len(edges))
    step = max(1, len(edges) // num_ticks)
    for idx in range(0, len(edges), step):
        edge = edges[idx]
        x = plot_left + (edge - edges[0]) / (edges[-1] - edges[0]) * (plot_right - plot_left)
        x_ticks.append((x, f"{edge:,}"))
    if len(edges) >= 2 and edges[-1] != edges[-2]:
        x = plot_right
        x_ticks.append((x, f"{edges[-1]:,}"))

    y_ticks = []
    for i in range(6):
        value = y_max * i / 5
        y = plot_bottom - (plot_bottom - plot_top) * (value / y_max if y_max else 0)
        y_ticks.append((y, f"{int(round(value))}"))

    draw_axes(draw, (plot_left, plot_top, plot_right, plot_bottom), x_ticks, y_ticks, grid_color=grid_color)

    bar_width = (plot_right - plot_left) / max(len(counts), 1)
    palette = ['#00369f', '#0076df', '#2698ba', '#00ab37', '#f29105']
    for idx, count in enumerate(counts):
        x0 = plot_left + idx * bar_width + 10
        x1 = x0 + bar_width - 20
        y = plot_bottom - (plot_bottom - plot_top) * (count / y_max if y_max else 0)
        color = palette[idx % len(palette)]
        draw.rounded_rectangle([x0, y, x1, plot_bottom], radius=8, fill=color)

    axis_label_color = '#1c1c1d'
    draw.text((plot_left, plot_bottom + 60), 'Word count bins', font=FONT_SMALL, fill=axis_label_color)
    draw.text((margin['left'] - 120, plot_top - 80), 'Number of posts', font=FONT_SMALL, fill=axis_label_color)

    output_path = OUTPUT_DIR / 'post-length-histogram.png'
    img.save(output_path, format='PNG')
    return output_path


def render_word_cloud(frequencies: Counter) -> Path:
    width, height = 1400, 900
    background_color = '#f9f7f4'
    title_color = '#00369f'
    subtitle_color = '#4f5257'
    palette = ['#00369f', '#0076df', '#2698ba', '#00ab37', '#f29105', '#ff3636']
    img = Image.new('RGB', (width, height), color=background_color)
    draw = ImageDraw.Draw(img)
    draw.text((40, 40), 'Common Words in the Archive', fill=title_color, font=FONT_TITLE)
    draw.text((40, 100), 'Stop words and high-frequency filler terms removed for clarity.', fill=subtitle_color, font=FONT_SMALL)

    cloud_area = (60, 160, width - 60, height - 60)
    usable_width = cloud_area[2] - cloud_area[0]
    usable_height = cloud_area[3] - cloud_area[1]

    top_words = frequencies.most_common(150)
    if not top_words:
        raise ValueError('No words to include in the word cloud')

    random.seed(42)
    placements: List[Tuple[Tuple[int, int, int, int], str, ImageFont.FreeTypeFont, Tuple[int, int, int]]] = []
    max_freq = top_words[0][1]
    min_freq = top_words[-1][1]
    freq_range = max_freq - min_freq if max_freq != min_freq else 1

    for word, freq in top_words:
        weight = (freq - min_freq) / freq_range
        font_size = int(24 + weight * 80)
        font = ImageFont.truetype('DejaVuSans.ttf', font_size)
        color_hex = random.choice(palette)
        color = tuple(int(color_hex[i:i + 2], 16) for i in (1, 3, 5))
        attempts = 0
        placed = False
        while attempts < 200 and not placed:
            attempts += 1
            x = cloud_area[0] + random.randint(0, max(0, usable_width - 10))
            y = cloud_area[1] + random.randint(0, max(0, usable_height - 10))
            bbox = draw.textbbox((x, y), word, font=font)
            # Shift if overflow
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            if text_width > usable_width or text_height > usable_height:
                continue
            x = min(x, cloud_area[2] - text_width)
            y = min(y, cloud_area[3] - text_height)
            bbox = (x, y, x + text_width, y + text_height)
            if any(intersect(bbox, existing[0]) for existing in placements):
                continue
            placements.append((bbox, word, font, color))
            placed = True
    random.shuffle(placements)
    for bbox, word, font, color in placements:
        draw.text((bbox[0], bbox[1]), word, font=font, fill=color)

    output_path = OUTPUT_DIR / 'word-cloud.png'
    img.save(output_path, format='PNG')
    return output_path


def intersect(box_a: Tuple[int, int, int, int], box_b: Tuple[int, int, int, int]) -> bool:
    ax0, ay0, ax1, ay1 = box_a
    bx0, by0, bx1, by1 = box_b
    return not (ax1 <= bx0 or ax0 >= bx1 or ay1 <= by0 or ay0 >= by1)


def main() -> None:
    posts = list(iter_posts(POSTS_DIR))
    quarters, quarterly_counts, cumulative_avg = build_quarter_series(posts)
    histogram_edges, histogram_counts = compute_histogram_bins([p.word_count for p in posts])
    word_freq = aggregate_word_frequencies(posts)

    quarterly_chart = render_quarterly_chart(quarters, quarterly_counts, cumulative_avg)
    histogram_chart = render_histogram(histogram_edges, histogram_counts)
    word_cloud = render_word_cloud(word_freq)

    summary = {
        'total_posts': len(posts),
        'total_words': sum(p.word_count for p in posts),
        'avg_words': sum(p.word_count for p in posts) / len(posts) if posts else 0,
        'quarterly_chart': str(quarterly_chart.relative_to(ROOT)),
        'histogram_chart': str(histogram_chart.relative_to(ROOT)),
        'word_cloud': str(word_cloud.relative_to(ROOT))
    }

    summary_path = OUTPUT_DIR / 'summary.txt'
    with summary_path.open('w', encoding='utf-8') as fh:
        for key, value in summary.items():
            fh.write(f"{key}: {value}\n")


if __name__ == '__main__':
    main()
