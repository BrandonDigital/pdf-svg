// Proper SVG Parser implementation
export class SVGParser {
  parse(svgString) {
    // Clean up the SVG string
    svgString = svgString.trim();

    // Create a simple DOM-like structure
    const root = this.parseElement(svgString);
    return root;
  }

  parseElement(str) {
    // Match opening tag
    const openTagMatch = str.match(/^<(\w+)([^>]*)>/);
    if (!openTagMatch) return null;

    const tagName = openTagMatch[1];
    const attrsString = openTagMatch[2];
    const element = {
      tagName: tagName.toLowerCase(),
      attributes: this.parseAttributes(attrsString),
      children: [],
    };

    // Remove the opening tag
    str = str.substring(openTagMatch[0].length);

    // Check if self-closing
    if (attrsString.endsWith("/")) {
      return element;
    }

    // Parse children until we find the closing tag
    const closingTag = `</${tagName}>`;
    const closingIndex = str.lastIndexOf(closingTag);

    if (closingIndex === -1) {
      console.warn(`No closing tag found for ${tagName}`);
      return element;
    }

    const innerContent = str.substring(0, closingIndex);
    element.children = this.parseChildren(innerContent);

    return element;
  }

  parseChildren(str) {
    const children = [];
    let remaining = str.trim();

    while (remaining) {
      // Skip whitespace
      remaining = remaining.trim();
      if (!remaining) break;

      // Check for element
      if (remaining.startsWith("<")) {
        // Find the end of this element
        const tagMatch = remaining.match(/^<(\w+)([^>]*)>/);
        if (tagMatch) {
          const tagName = tagMatch[1];
          const isSelfClosing = tagMatch[2].endsWith("/");

          if (isSelfClosing) {
            // Self-closing tag
            const element = {
              tagName: tagName.toLowerCase(),
              attributes: this.parseAttributes(tagMatch[2]),
              children: [],
            };
            children.push(element);
            remaining = remaining.substring(tagMatch[0].length);
          } else {
            // Find matching closing tag
            const closingTag = `</${tagName}>`;
            let depth = 1;
            let pos = tagMatch[0].length;

            while (depth > 0 && pos < remaining.length) {
              const nextOpen = remaining.indexOf(`<${tagName}`, pos);
              const nextClose = remaining.indexOf(closingTag, pos);

              if (nextClose === -1) break;

              if (nextOpen !== -1 && nextOpen < nextClose) {
                depth++;
                pos = nextOpen + 1;
              } else {
                depth--;
                if (depth === 0) {
                  const fullElement = remaining.substring(
                    0,
                    nextClose + closingTag.length
                  );
                  const element = this.parseElement(fullElement);
                  if (element) children.push(element);
                  remaining = remaining.substring(
                    nextClose + closingTag.length
                  );
                } else {
                  pos = nextClose + 1;
                }
              }
            }

            if (depth > 0) {
              console.warn(`Unclosed tag: ${tagName}`);
              break;
            }
          }
        } else {
          // Not a valid tag, skip
          remaining = remaining.substring(1);
        }
      } else {
        // Text content - for now we'll skip it
        const nextTag = remaining.indexOf("<");
        if (nextTag === -1) {
          break;
        } else {
          remaining = remaining.substring(nextTag);
        }
      }
    }

    return children;
  }

  parseAttributes(attrString) {
    const attrs = {};
    const attrRegex = /(\w+(?:-\w+)*)(?:\s*=\s*"([^"]*)"|\s*=\s*'([^']*)')?/g;
    let match;

    while ((match = attrRegex.exec(attrString)) !== null) {
      const name = match[1];
      const value = match[2] || match[3] || "";
      attrs[name] = value;
    }

    return attrs;
  }
}

// Helper to create element accessor
export function createElement(element) {
  return {
    tagName: element.tagName,
    getAttribute(name) {
      return element.attributes[name] || null;
    },
    children: element.children,
    attributes: element.attributes,
  };
}
