/* ==========================================================================
   Markdown bridge for the knowledge vault
   - HTML (contenteditable) -> Markdown
   - Markdown (imported files) -> safe HTML
   - Keeps wiki links [[Title]] / [[Title|Alias]]
   ========================================================================== */
(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
  }

  function escapeInlineText(value) {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_');
  }

  function escapeTableCell(value) {
    return escapeInlineText(value).replace(/\|/g, '\\|');
  }

  function codeFenceFor(value) {
    let fence = '```';
    while (value.indexOf(fence) >= 0) fence += '`';
    return fence;
  }

  function inlineToMarkdown(node) {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        out += escapeInlineText(child.textContent);
        return;
      }
      if (child.nodeType !== 1) return;
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') {
        out += '  \n';
        return;
      }
      if (tag === 'strong' || tag === 'b') {
        out += '**' + inlineToMarkdown(child).trim() + '**';
        return;
      }
      if (tag === 'em' || tag === 'i') {
        out += '*' + inlineToMarkdown(child).trim() + '*';
        return;
      }
      if (tag === 's' || tag === 'del' || tag === 'strike') {
        out += '~~' + inlineToMarkdown(child).trim() + '~~';
        return;
      }
      if (tag === 'code') {
        const code = child.textContent.replace(/`/g, '\\`');
        out += '`' + code + '`';
        return;
      }
      if (tag === 'a') {
        const wiki = child.getAttribute('data-wiki');
        if (wiki !== null && wiki !== undefined) {
          const text = child.textContent.trim();
          out += `[[${wiki}${text && text !== wiki ? `|${text}` : ''}]]`;
          return;
        }
        const href = child.getAttribute('href') || '';
        const text = inlineToMarkdown(child).trim() || href;
        out += `[${text}](${href})`;
        return;
      }
      if (tag === 'img') {
        const src = child.getAttribute('src') || '';
        const alt = child.getAttribute('alt') || '';
        out += `![${alt}](${src})`;
        return;
      }
      if (tag === 'span' || tag === 'mark' || tag === 'sup' || tag === 'sub') {
        out += inlineToMarkdown(child);
        return;
      }
      out += inlineToMarkdown(child);
    });
    return out;
  }

  function convertNodeToMarkdown(node) {
    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      return text ? escapeInlineText(text) : '';
    }
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
      const level = Number(tag.slice(1));
      return '#'.repeat(level) + ' ' + inlineToMarkdown(node).trim();
    }
    if (tag === 'p') return inlineToMarkdown(node).trim();
    if (tag === 'pre') {
      const code = node.querySelector('code');
      const source = (code || node).textContent.replace(/\n$/, '');
      let language = '';
      if (code) {
        const className = code.className || '';
        const match = className.match(/language-([\w-]+)/);
        if (match) language = match[1];
      }
      const fence = codeFenceFor(source);
      return `${fence}${language}\n${source}\n${fence}`;
    }
    if (tag === 'blockquote') {
      const inner = convertChildrenToMarkdown(node);
      return inner.split('\n').map((line) => '> ' + line).join('\n');
    }
    if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol';
      const items = Array.from(node.children).filter((child) => child.tagName === 'LI');
      return items.map((li, index) => {
        const clone = li.cloneNode(true);
        clone.querySelectorAll(':scope > ul, :scope > ol').forEach((list) => list.remove());
        const main = inlineToMarkdown(clone).trim().replace(/\s+/g, ' ');
        const nested = Array.from(li.children)
          .filter((child) => child.tagName === 'UL' || child.tagName === 'OL')
          .map((child) => convertNodeToMarkdown(child))
          .join('\n');
        const marker = ordered ? `${index + 1}.` : '-';
        return '  '.repeat(0) + `${marker} ${main}` + (nested ? '\n' + nested.replace(/^/gm, '  ') : '');
      }).join('\n');
    }
    if (tag === 'hr') return '---';
    if (tag === 'table') {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (!rows.length) return '';
      const matrix = rows.map((row) => Array.from(row.children)
        .filter((cell) => cell.tagName === 'TH' || cell.tagName === 'TD')
        .map((cell) => escapeTableCell(inlineToMarkdown(cell).trim().replace(/\n/g, ' '))));
      const columnCount = Math.max(...matrix.map((row) => row.length));
      const padded = matrix.map((row) => {
        const next = row.slice();
        while (next.length < columnCount) next.push('');
        return next;
      });
      const header = padded[0] || [];
      const lines = [
        '| ' + header.join(' | ') + ' |',
        '| ' + header.map(() => '---').join(' | ') + ' |'
      ];
      padded.slice(1).forEach((row) => {
        lines.push('| ' + row.join(' | ') + ' |');
      });
      return lines.join('\n');
    }
    if (tag === 'img') {
      return `![${node.getAttribute('alt') || ''}](${node.getAttribute('src') || ''})`;
    }
    if (tag === 'br') return '';
    return convertChildrenToMarkdown(node);
  }

  function convertChildrenToMarkdown(node) {
    const blocks = [];
    node.childNodes.forEach((child) => {
      const converted = convertNodeToMarkdown(child);
      if (converted && converted.trim()) blocks.push(converted.trim());
    });
    return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n');
  }

  function htmlToMarkdown(htmlOrElement) {
    let root;
    if (typeof htmlOrElement === 'string') {
      const template = document.createElement('template');
      template.innerHTML = htmlOrElement;
      root = template.content;
    } else {
      root = htmlOrElement;
    }
    const blocks = [];
    root.childNodes.forEach((child) => {
      const converted = convertNodeToMarkdown(child);
      if (converted && converted.trim()) blocks.push(converted.trim());
    });
    return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* ------------------------------ Markdown -> HTML ------------------------------ */

  function safeUrl(value) {
    const url = String(value || '').trim();
    if (!url) return '#';
    if (/^(javascript|vbscript):/i.test(url)) return '#';
    return url;
  }

  function renderInline(text) {
    const tokens = [];
    const stash = (html) => {
      tokens.push(html);
      return `\u0000${tokens.length - 1}\u0000`;
    };
    let source = String(text == null ? '' : text);

    source = source.replace(/`([^`\n]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`));
    source = source.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, alt, src) => stash(
      `<img src="${escapeAttr(safeUrl(src))}" alt="${escapeAttr(alt)}" />`
    ));
    source = source.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, alias) => {
      const label = (alias || target).trim();
      return stash(`<a class="wiki-link" data-wiki="${escapeAttr(target.trim())}" href="#/note/${encodeURIComponent(target.trim())}">${escapeHtml(label)}</a>`);
    });
    source = source.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, label, href) => stash(
      `<a href="${escapeAttr(safeUrl(href))}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`
    ));

    source = escapeHtml(source);
    source = source.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    source = source.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    source = source.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    source = source.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    source = source.replace(/_([^_\n]+)_/g, '<em>$1</em>');
    source = source.replace(/  \n/g, '<br>');
    source = source.replace(/\n/g, ' ');
    source = source.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)] || '');
    return source;
  }

  function isBlockStart(line) {
    return /^\s*(#{1,6})\s+/.test(line)
      || /^\s*```/.test(line)
      || /^\s*>\s?/.test(line)
      || /^\s*(---+|\*\*\*+|___+)\s*$/.test(line)
      || /^\s*([-*+]|\d+\.)\s+/.test(line)
      || /^\s*\|.+\|\s*$/.test(line);
  }

  function parseList(lines, start, baseIndent) {
    const first = lines[start].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    const ordered = first ? /^\d+\./.test(first[2]) : false;
    let html = ordered ? '<ol>' : '<ul>';
    let i = start;
    while (i < lines.length) {
      const match = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
      if (!match) break;
      const indent = match[1].length;
      if (indent < baseIndent) break;
      if (indent > baseIndent) {
        const nested = parseList(lines, i, indent);
        html += nested.html;
        i = nested.i;
        continue;
      }
      let content = match[3];
      i += 1;
      let nestedHtml = '';
      while (i < lines.length) {
        const next = lines[i].match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
        if (next) {
          if (next[1].length > baseIndent) {
            const nested = parseList(lines, i, next[1].length);
            nestedHtml += nested.html;
            i = nested.i;
            continue;
          }
          break;
        }
        if (!lines[i].trim()) {
          i += 1;
          break;
        }
        if (/^\s+/.test(lines[i])) {
          content += ' ' + lines[i].trim();
          i += 1;
          continue;
        }
        break;
      }
      const tag = ordered ? 'ol' : 'ul';
      html += `<li>${renderInline(content)}${nestedHtml}</li>`;
      void tag;
    }
    html += ordered ? '</ol>' : '</ul>';
    return { html, i };
  }

  function parseBlocks(lines) {
    let html = '';
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }
      const fence = line.match(/^\s*```([\w-]*)\s*$/);
      if (fence) {
        const language = fence[1] || '';
        const code = [];
        i += 1;
        while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        if (i < lines.length) i += 1;
        html += `<pre><code${language ? ` class="language-${escapeAttr(language)}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`;
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        const level = heading[1].length;
        html += `<h${level}>${renderInline(heading[2].trim())}</h${level}>`;
        i += 1;
        continue;
      }
      if (/^\s*(---+|\*\*\*+|___+)\s*$/.test(line)) {
        html += '<hr>';
        i += 1;
        continue;
      }
      if (/^\s*>\s?/.test(line)) {
        const quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i += 1;
        }
        html += `<blockquote>${parseBlocks(quote)}</blockquote>`;
        continue;
      }
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
        const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
        const list = parseList(lines, i, indent);
        html += list.html;
        i = list.i;
        continue;
      }
      if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && /-/.test(lines[i + 1])) {
        const splitRow = (row) => row.replace(/^\s*\||\|\s*$/g, '').split('|').map((cell) => cell.trim());
        const header = splitRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim()) {
          rows.push(splitRow(lines[i]));
          i += 1;
        }
        html += '<table><thead><tr>' + header.map((cell) => `<th>${renderInline(cell)}</th>`).join('') + '</tr></thead><tbody>';
        rows.forEach((row) => {
          html += '<tr>' + row.map((cell) => `<td>${renderInline(cell)}</td>`).join('') + '</tr>';
        });
        html += '</tbody></table>';
        continue;
      }
      const paragraph = [line.trim()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      html += `<p>${renderInline(paragraph.join('\n'))}</p>`;
    }
    return html;
  }

  function markdownToHtml(markdown) {
    const source = String(markdown == null ? '' : markdown)
      .replace(/\r\n?/g, '\n')
      .replace(/^---\n[\s\S]*?\n---\s*\n?/, '');
    const html = parseBlocks(source.split('\n'));
    return html.trim() || '<p></p>';
  }

  window.KnowledgeMarkdown = {
    htmlToMarkdown,
    markdownToHtml,
    escapeHtml
  };
})();
