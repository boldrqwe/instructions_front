import type { Element, Node, Parent, Root, Text } from 'hast';
import { toString } from 'hast-util-to-string';
import { visitParents } from 'unist-util-visit-parents';

/**
 * Rehype-плагин, который превращает одиночные <code> блоки в полноценные code-block-и.
 *
 * Некоторые редакторы экспортируют блоки кода как одиночный тег <code> (без <pre>). Из-за этого
 * содержимое рендерится как inline-код. Плагин заворачивает такие элементы в <pre>, чтобы на фронте
 * сработали копирование, подсветка и нумерация строк.
 */
export function rehypeWrapStandaloneCode() {
    return (tree: Root) => {
        visitParents(tree, 'element', (node, ancestors) => {
            if (node.tagName !== 'code') {
                return;
            }

            const parent = ancestors[ancestors.length - 1];
            if (!isParent(parent)) {
                return;
            }

            if (parent.type === 'element' && parent.tagName === 'pre') {
                return;
            }

            const className = normaliseClassName(node.properties?.className);
            const textContent = toString(node);
            const hasLanguageClass = className.some((cls) => cls.startsWith('language-'));
            const looksLikeBlock = hasLanguageClass || textContent.includes('\n');

            if (!looksLikeBlock) {
                return;
            }

            const language = extractLanguage(className);
            const upperLanguage = language?.toUpperCase();

            const codeNode: Element = {
                type: 'element',
                tagName: 'code',
                properties: {
                    ...node.properties,
                    className,
                    ...(upperLanguage ? { 'data-language': upperLanguage } : {}),
                },
                children: node.children,
            };

            const preNode: Element = {
                type: 'element',
                tagName: 'pre',
                properties: upperLanguage ? { 'data-language': upperLanguage } : undefined,
                children: [codeNode],
            };

            if (parent.type === 'element' && parent.tagName === 'p') {
                const grandParent = ancestors[ancestors.length - 2];
                if (isParent(grandParent)) {
                    const meaningfulSiblings = parent.children.filter(
                        (child) => child !== node && !isWhitespaceText(child),
                    );

                    if (meaningfulSiblings.length === 0) {
                        const parentIndex = grandParent.children.indexOf(parent);
                        if (parentIndex >= 0) {
                            grandParent.children.splice(parentIndex, 1, preNode);
                        }
                        return;
                    }
                }
            }

            const nodeIndex = parent.children.indexOf(node);
            if (nodeIndex >= 0) {
                parent.children.splice(nodeIndex, 1, preNode);
            }
        });
    };
}

function normaliseClassName(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.flatMap((item) =>
            typeof item === 'string' ? item.split(/\s+/).filter(Boolean) : []
        );
    }

    if (typeof value === 'string') {
        return value.split(/\s+/).filter(Boolean);
    }

    return [];
}

function extractLanguage(classNames: string[]): string | undefined {
    const languageClass = classNames.find((cls) => cls.startsWith('language-'));
    return languageClass ? languageClass.replace('language-', '') : undefined;
}

function isParent(node: Node | undefined): node is Parent {
    return Boolean(node && 'children' in node && Array.isArray((node as Parent).children));
}

function isWhitespaceText(node: Node): boolean {
    return node.type === 'text' && typeof (node as Text).value === 'string' && !(node as Text).value.trim();
}
