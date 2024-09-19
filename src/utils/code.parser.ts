import ts from 'typescript';

interface DocStringTag {
  tag: string;
  text: string;
}

export function getDocStrings(fileContent: string): DocStringTag[] {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const docStringTags: DocStringTag[] = [];
  const processedRanges = new Set<string>();

  function parseJSDocComment(commentText: string): DocStringTag[] {
    const lines = commentText.split('\n');
    const tags: DocStringTag[] = [];
    let currentTag: DocStringTag | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim().replace(/^\*\s*/, '');
      if (trimmedLine.startsWith('@')) {
        if (currentTag) {
          tags.push(currentTag);
        }
        const [tag, ...textParts] = trimmedLine.split(' ');
        currentTag = { tag: tag.slice(1), text: textParts.join(' ') };
      } else if (currentTag) {
        currentTag.text += ' ' + trimmedLine;
      }
    }

    if (currentTag) {
      tags.push(currentTag);
    }

    return tags;
  }

  function visit(node: ts.Node) {
    const jsDocComments = ts.getLeadingCommentRanges(fileContent, node.pos);
    
    if (jsDocComments && jsDocComments.length > 0) {
      jsDocComments.forEach(comment => {
        if (comment.kind === ts.SyntaxKind.MultiLineCommentTrivia) {
          const commentText = fileContent.substring(comment.pos, comment.end);
          
          if (commentText.startsWith('/**') && commentText.endsWith('*/')) {
            const rangeKey = `${comment.pos}-${comment.end}`;
            if (!processedRanges.has(rangeKey)) {
              processedRanges.add(rangeKey);
              const tags = parseJSDocComment(commentText);
              docStringTags.push(...tags);
              console.log(`Added tags:`, tags);
            }
          }
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  console.log(`Total tags found: ${docStringTags.length}`);
  return docStringTags;
}