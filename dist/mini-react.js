"use strict";
function createElement(type, props, ...children) {
    return {
        type,
        props: Object.assign(Object.assign({}, props), { children: children.map(child => {
                const isTextNode = ["number", "boolean", "string", "undefined"].some(type => typeof child === type);
                return isTextNode ? createTextNode(child) : child;
            }) })
    };
}
function createTextNode(nodeValue) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue,
            children: []
        }
    };
}
let nextUnitOfWork = null;
let wipRoot = null;
let currentRoot = null;
function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element]
        },
        alternate: currentRoot
    };
    nextUnitOfWork = wipRoot;
}
function workLoop() {
}
const SuperReact = { createElement };
window.SuperReact = SuperReact;
