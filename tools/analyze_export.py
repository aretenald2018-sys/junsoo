from __future__ import annotations

import csv
import json
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path


KEYWORDS = [
    "연락",
    "전화",
    "문자",
    "카톡",
    "채널",
    "예약",
    "내원",
    "해피콜",
    "경과",
    "확인",
    "부재중",
    "처방",
    "재처방",
    "비대면",
    "해독",
    "본약",
    "소퍼",
    "결제",
    "환불",
    "완료",
    "문제",
    "VIP",
]


def trailing_page_id(path: Path) -> str | None:
    match = re.search(r"([0-9a-f]{32})(?:\s*\(\d+\))?\.md$", path.name, re.I)
    return match.group(1).lower() if match else None


def title_stub(path: Path) -> str:
    title = re.sub(r"\s+[0-9a-f]{32}(?:\s*\(\d+\))?\.md$", "", path.name, flags=re.I)
    title = re.sub(r"\(\d+\)$", "", title).strip()
    title = re.sub(r"\d+", "#", title)
    title = re.sub(r"\s+", " ", title)
    return title


def safe_stats(values: list[int]) -> dict[str, int | float]:
    if not values:
        return {"min": 0, "median": 0, "p90": 0, "max": 0}
    ordered = sorted(values)
    p90_index = min(len(ordered) - 1, int(len(ordered) * 0.9))
    return {
        "min": ordered[0],
        "median": statistics.median(ordered),
        "p90": ordered[p90_index],
        "max": ordered[-1],
    }


def analyze_csv(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = reader.fieldnames or []
        row_count = 0
        non_empty = Counter()
        sample_types: dict[str, Counter[str]] = defaultdict(Counter)
        for row in reader:
            row_count += 1
            for key in headers:
                value = (row.get(key) or "").strip()
                if value:
                    non_empty[key] += 1
                    if re.fullmatch(r"-?\d+(?:\.\d+)?", value):
                        sample_types[key]["number_like"] += 1
                    elif re.search(r"\d{4}[-./]\d{1,2}[-./]\d{1,2}", value):
                        sample_types[key]["date_like"] += 1
                    elif value.startswith("http://") or value.startswith("https://"):
                        sample_types[key]["url_like"] += 1
                    else:
                        sample_types[key]["text_like"] += 1
        # Re-read for safe, non-PII operational summaries. Do not emit names,
        # notes, or free-text content values.
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        done_values = Counter()
        complete_values = Counter()
        d_day_classes = Counter()
        date_months = Counter()
        name_shape = Counter()
        row_count_2 = 0
        for row in reader:
            row_count_2 += 1
            done_values[(row.get("DONE") or "<blank>").strip() or "<blank>"] += 1
            complete_values[(row.get("완료") or "<blank>").strip() or "<blank>"] += 1

            d_day = (row.get("D-day") or "").strip()
            if not d_day:
                d_day_classes["blank"] += 1
            elif re.search(r"D\s*-\s*\d+", d_day, re.I):
                d_day_classes["future_D_minus"] += 1
            elif re.search(r"D\s*\+\s*\d+", d_day, re.I):
                d_day_classes["past_D_plus"] += 1
            elif re.search(r"D\s*day|D\s*0|today|오늘", d_day, re.I):
                d_day_classes["today_or_due"] += 1
            else:
                d_day_classes["other_text"] += 1

            date_value = (row.get("날짜") or "").strip()
            date_match = re.search(r"(\d{4})[-./](\d{1,2})[-./](\d{1,2})", date_value)
            if date_match:
                date_months[f"{date_match.group(1)}-{int(date_match.group(2)):02d}"] += 1

            name_value = (row.get("이름") or "").strip()
            if not name_value:
                name_shape["blank"] += 1
            else:
                name_shape["present"] += 1
                if re.search(r"(?<!\d)\d{2}(?!\d)", name_value):
                    name_shape["has_two_digit_suffix"] += 1
                if re.search(r"[,/&·+]|\\s{2,}", name_value):
                    name_shape["multi_entity_marker"] += 1
                if re.search(r"\d{1,2}\s*(?:시|:)", name_value):
                    name_shape["contains_time_marker"] += 1
                if re.search(r"연락|전화|문자|카톡|경과|해피콜|처방|확인|예약|내원|환불|해독", name_value):
                    name_shape["contains_action_marker"] += 1
        return {
            "file": "<redacted>",
            "rows": row_count,
            "headers": headers,
            "non_empty_by_header": dict(non_empty),
            "observed_value_types": {k: dict(v) for k, v in sample_types.items()},
            "safe_operational_summary": {
                "row_count_check": row_count_2,
                "DONE_value_counts": dict(done_values),
                "완료_value_counts": dict(complete_values),
                "D_day_class_counts": dict(d_day_classes),
                "date_month_counts": dict(sorted(date_months.items())),
                "name_shape_counts": dict(name_shape),
            },
        }


def analyze_markdown(paths: list[Path]) -> dict:
    size_values: list[int] = []
    line_values: list[int] = []
    page_ids = Counter()
    title_patterns = Counter()
    property_keys = Counter()
    keyword_files = Counter()
    keyword_mentions = Counter()
    checkbox_counts = Counter()
    channel_counts = Counter()
    relation_markers = Counter()
    structural_counts = Counter()
    md_parse_errors = 0

    for path in paths:
        try:
            text = path.read_text(encoding="utf-8-sig", errors="replace")
        except OSError:
            md_parse_errors += 1
            continue

        size_values.append(len(text))
        line_values.append(len(text.splitlines()))
        page_id = trailing_page_id(path)
        if page_id:
            page_ids[page_id] += 1
        title_patterns[title_stub(path)] += 1

        for line in text.splitlines()[:60]:
            match = re.match(r"^\s*([^:\n]{1,40})\s*:\s*(.+)$", line)
            if match:
                key = match.group(1).strip()
                if not re.search(r"\d", key):
                    property_keys[key] += 1

        for keyword in KEYWORDS:
            count = text.count(keyword) + path.name.count(keyword)
            if count:
                keyword_files[keyword] += 1
                keyword_mentions[keyword] += count

        checkbox_counts["checked"] += len(re.findall(r"\[[xX]\]", text))
        checkbox_counts["unchecked"] += len(re.findall(r"\[ \]", text))
        structural_counts["files_with_urls"] += int(bool(re.search(r"https?://", text)))
        structural_counts["files_with_tables"] += int(bool(re.search(r"^\s*\|.+\|\s*$", text, re.M)))
        structural_counts["files_with_headings"] += int(bool(re.search(r"^#{1,6}\s+", text, re.M)))
        structural_counts["files_with_timestamps"] += int(bool(re.search(r"\d{1,2}\s*(?:시|:)\s*\d{0,2}", text)))
        structural_counts["files_with_birth_suffix"] += int(bool(re.search(r"(?<!\d)\d{2}(?!\d)", path.stem)))

        if "전화" in text or "전화" in path.name:
            channel_counts["phone"] += 1
        if "문자" in text or "문자" in path.name:
            channel_counts["sms"] += 1
        if "카톡" in text or "카톡" in path.name or "채널" in text or "채널" in path.name:
            channel_counts["kakao_or_channel"] += 1
        if "비대면" in text or "비대면" in path.name:
            channel_counts["remote_care"] += 1

        if "→" in text or "→" in path.name:
            relation_markers["arrow"] += 1
        if "," in path.stem:
            relation_markers["comma_in_title"] += 1
        if " " in path.stem:
            relation_markers["space_in_title"] += 1

    duplicate_page_ids = sum(1 for _, count in page_ids.items() if count > 1)
    duplicate_title_patterns = sum(1 for _, count in title_patterns.items() if count > 1)
    top_title_pattern_counts = Counter(title_patterns.values())

    return {
        "md_files": len(paths),
        "md_parse_errors": md_parse_errors,
        "content_size_chars": safe_stats(size_values),
        "line_counts": safe_stats(line_values),
        "duplicate_page_id_groups": duplicate_page_ids,
        "duplicate_redacted_title_pattern_groups": duplicate_title_patterns,
        "title_pattern_group_size_distribution": dict(sorted(top_title_pattern_counts.items())),
        "top_property_keys": property_keys.most_common(40),
        "keyword_files": keyword_files.most_common(),
        "keyword_mentions": keyword_mentions.most_common(),
        "checkbox_counts": dict(checkbox_counts),
        "channel_counts": dict(channel_counts),
        "relation_markers": dict(relation_markers),
        "structural_counts": dict(structural_counts),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: analyze_export.py <export-folder>", file=sys.stderr)
        return 2

    root = Path(sys.argv[1])
    files = [path for path in root.rglob("*") if path.is_file()]
    by_ext = Counter(path.suffix.lower() or "<none>" for path in files)
    csv_paths = sorted(root.rglob("*.csv"))
    md_paths = sorted(root.rglob("*.md"))

    result = {
        "root": "<redacted>",
        "total_files": len(files),
        "files_by_extension": dict(sorted(by_ext.items())),
        "csv": [analyze_csv(path) for path in csv_paths],
        "markdown": analyze_markdown(md_paths),
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
