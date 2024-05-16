function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map(child => {
                const isTextNode = ["number", "boolean", "string", "undefined"].some(type => typeof child === type)
                return isTextNode ?createTextNode(child): child
            })
        }
    }
}


function createTextNode(nodeValue) {
    return {
        type: "TEXT_ELEMENT",
        props: {
            nodeValue,
            children: []
        }
    }
}


let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null

function render(element,container){
    wipRoot = {
        dom:container,
        props:{
            children:[element]
        },
        alternate:currentRoot
    }
    nextUnitOfWork = wipRoot

}

function workLoop(deadline){
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
        shouldYield = deadline.timeRemaining() < 1
    }
    requestIdleCallback(workLoop)
}

function performUnitOfWork(fiber){

    const isFunctionComponent = fiber.type instanceof Function

    if(isFunctionComponent){
        updateFunctionComponent(fiber)
    }else{
        updateHostComponent(fiber)
    }


    if(fiber.child){
        return fiber.child
    }

    let nextFiber = fiber

    while (nextFiber){
        if(nextFiber.sibling){
            return nextFiber.sibling
        }
        nextFiber = nextFiber.return
    }

}


let wipFiber = null
let stateHooksIndex = null

function updateFunctionComponent(fiber){
    wipFiber = fiber
    stateHooksIndex = 0
    wipFiber.stateHooks = []
    wipFiber.effectHooks = []

    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber,children)

}

function updateHostComponent(fiber){
    if(!fiber.dom){
        fiber.dom = createDom(fiber)
    }

    reconcileChildren(fiber,fiber.props.children)
}


function reconcileChildren (){

}






const SuperReact = { createElement }

window.SuperReact = SuperReact