(function () {
    /* 使用create 创建每一个 vdom 节点 */
    function createElement(type, props, ...children) {
        return {
            type,
            props: {
                ...props,
                children: children.map(child => {
                    const isTextNode = ["number", "string"].some(type => typeof child === type)
                    return isTextNode ? createTextNode(child) : child
                })
            }
        }
    }

    /* 文字节点做一下单独处理 */
    function createTextNode(nodeValue) {
        return {
            type: "TEXT_ELEMENT",
            props: {
                /* 
                    createText 创建文本节点后 会直接nodeValue 赋值给文本节点，文本节点可以 通过nodeValue 
                    直接设置值
                 */
                nodeValue,
                children: []
            }
        }
    }

    /* 进行reconcile 中的单个fiber 节点 */
    let nextUnitOfWork = null
    /* reconcile 中的单个fiber 树 */
    let wipRoot = null
    /* 已经渲染完的fiber 树
        这两个fiber 树也是react 中比较有名的 两个fiber树
        一个是已经处理完成渲染在试图上的fiber 也就是 currentRoot
        一个是正在进行reconcile 中的fiber 也就是 wipRoot

        我个人理解 为什么 react中要用两个fiber 树 而不用一个
        是因为react 是需要旧节点和旧节点的关联关系的，比如 在commit 阶段执行 deletion
        的时候，一般都会用父级别dom 来进行删除操作，这时就需要知道旧节点的父节点dom
        如果是单fiber 就需要预先去存储，代码复杂度就会很高。

        想一下 gpu 的双缓冲区特点 和 浏览器 gc 新生代的 form to
        他们都是使用了双缓存这样一个操作，这是基于空间换时间的策略
        为了就是让降低代码执行复杂度，

      */
    let currentRoot = null
    /* 要执行删除操作的 fiber 单节点 */
    let deletions = []

    /* 将一个fiber 树渲染到 dom 上去 */
    function render(element, container) {
        wipRoot = {
            dom: container,
            props: {
                children: [element]
            },
            alternate: currentRoot
        }
        deletions = []
        nextUnitOfWork = wipRoot

    }

    /* 循环处理每一个fiber 单节点 会以深度优先的方式 去处理 
        requestIdleCallback会给传入的函数传递一个IdleDeadline参数
        see [https://developer.mozilla.org/zh-CN/docs/Web/API/IdleDeadline]
        这个参数是个对象 对象上有一个timeRemaining 方法 方法返回的是一个浮点数 
        标识这一帧剩余的时间
    */
    function workLoop(deadline) {
        let shouldYield = false
        while (nextUnitOfWork && !shouldYield) {
            nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
            shouldYield = deadline.timeRemaining() < 1
        }
        /* 如果要处理的单节点已经没了 但是 wipRoot 还有，则是说明已经reconcile 阶段走完了
            该走 commit 阶段了
          */
        if (!nextUnitOfWork && wipRoot) {
            commitRoot()
        }
        requestIdleCallback(workLoop)
    }

    requestIdleCallback(workLoop)

    /* 单个节点的处理，这里会分流 普通fiber 节点和函数fiber 节点做不同的处理 */
    function performUnitOfWork(fiber) {

        const isFunctionComponent = fiber.type instanceof Function

        if (isFunctionComponent) {
            /* 处理函数节点 */
            updateFunctionComponent(fiber)
        } else {
            /* 处理非函数节点 */
            updateHostComponent(fiber)
        }

        /* 根据深度优先的原则，会先访问child 其次才是sibling  */
        if (fiber.child) {
            return fiber.child
        }

        let nextFiber = fiber
        /* 如果没有child 的话 会去找sibling  sibling没有的话 会去找return 也就是父元素 */
        while (nextFiber) {
            if (nextFiber.sibling) {
                return nextFiber.sibling
            }
            nextFiber = nextFiber.return
        }

    }


    let wipFiber = null
    let stateHooksIndex = null

    /* 函数fiber 节点会有 useState 和useEffect 所以这里 做了一些特殊处理 
       添加 hooks 列表 添加 effect 列表
     */
    function updateFunctionComponent(fiber) {
        wipFiber = fiber
        stateHooksIndex = 0
        wipFiber.stateHooks = []
        wipFiber.effectHooks = []

        const children = [fiber.type(fiber.props)]
        reconcileChildren(fiber, children)

    }

    /* 处理正常的dom */
    function updateHostComponent(fiber) {
        if (!fiber.dom) {
            fiber.dom = createDom(fiber)
        }

        reconcileChildren(fiber, fiber.props.children)
    }

    /* 创建dom 节点 区分文本节点和 标签节点  */
    function createDom(fiber) {
        const dom = fiber.type === 'TEXT_ELEMENT' ? document.createTextNode("") : document.createElement(fiber.type)
        /* 这里第二个参数是 {} 空对象 标识其实 本次的props是完全全新的  */
        updateDom(dom, {}, fiber.props)

        return dom
    }
    /* 属性是否是事件 */
    const isEvent = key => /^(on)/i.test(key)
    /* 是否是事件以外的property */
    const isProperty = key => (key !== "children") && (!isEvent(key))
    /* 柯里化函数判断新旧 数据内容是否一样 */
    const isNew = (prev, next) => key => prev[key] !== next[key]
    /* 判断key 是否不在 对象当中 */
    const isGone = (next) => key => !(key in next)


    /* 处理dom的事件 和property */
    function updateDom(dom, prevProps, nextProps) {
        /* 清除上一次的事件 */
        Object.keys(prevProps).filter(isEvent).filter((key) => {
            return !(key in nextProps) || isNew(prevProps, nextProps)(key)
        }).forEach((key) => {
            const eventType = key.toLowerCase().substring(2)
            dom.removeEventListener(eventType, prevProps[key])
        })
        /* 清除上一次dom 的property */
        Object.keys(prevProps).filter(isProperty).filter(isGone(nextProps)).forEach((key) => {
            dom[key] = ""
        })
        /* 添加新的property */
        Object.keys(nextProps).filter(isProperty).filter(isNew(prevProps, nextProps)).forEach(key => {
            dom[key] = nextProps[key]
        })
        /* 添加新的事件 */
        Object.keys(nextProps).filter(isEvent).filter(isNew(prevProps, nextProps)).forEach(key => {
            const eventType = key.toLowerCase().substring(2)
            dom.addEventListener(eventType, nextProps[key])
        })

    }


    /* 这里的  reconcileChildren 和上面 的 performUnitOfWork
        是稍微有一点重叠的处理
        reconcileChildren 只处理当前节点下的子节点，而performUnitOfWork 是循环的每一个节点的
        reconcileChildren会访问一遍子节点 performUnitOfWork 会访问所有的节点


    */
    function reconcileChildren(wipFiber, elements) {
        let index = 0
        /* 当前fiber 节点的第一个子节点 */
        let oldFiber = wipFiber.alternate?.child
        let prevSibling = null

        while (index < elements.length || oldFiber != null) {
            const element = elements[index]
            let newFiber = null
            const sameType = element?.type == oldFiber?.type
            /* 如果新的节点和旧的节点类型一样，那就走更新 */
            if (sameType) {
                newFiber = {
                    type: oldFiber.type,
                    props: element.props,
                    dom: oldFiber.dom,
                    return: wipFiber,
                    alternate: oldFiber,
                    effectTag: "UPDATE"
                }
            }
            /* 如果这个节点 在新的状况有 并且和之前的节点不一样 那么久走新增 */
            if (element && !sameType) {
                newFiber = {
                    type: element.type,
                    props: element.props,
                    dom: null,
                    return: wipFiber,
                    alternate: null,
                    effectTag: "PLACEMENT",

                }
            }
            /* 如果旧的节点有，但是和之前的不一样，那就走删除 */
            if (oldFiber && !sameType) {
                oldFiber.effectTag = "DELETION"
                deletions.push(oldFiber)
            }
            /* 子元素的下一个 */
            /* 此时 如果子节点是多个的话 多个子节点是呈现一个链表结构的
                  比如 
                  <div>
                      <p>1</p>
                      <span>2</span>
                  </div>

                  div 的child 是p  p的sibling 是span 
               */
            if (oldFiber) {
                oldFiber = oldFiber.sibling
            }
            /* 如果是第一次的遍历的话，就把标记后的节点，return 指向当前的节点 */
            if (index === 0) {
                /* 如果是第一次的话 就将 本次 reconcileChildren 的节点 的child 指向 newFiber
                    此时newFiber 是当前节点的第一个子节点
                 */
                wipFiber.child = newFiber
            } else if (element) {
                /* 这个地方稍微有点迷惑性
                    此时prevSibling 如果不是第一次进入的话
                    就指向了 newFiber 也就是当前的这一个子节点,
                    等到下一次循环,这个变量指向的是上一次的fiber,由于打标签后
                    是一个新的fiber节点对象,需要将上一个的节点的sibling 指向当前节点
                 */
                prevSibling.sibling = newFiber
            }

            prevSibling = newFiber

            index++


        }

    }

    function commitRoot() {
        deletions.forEach(commitWork)

        commitWork(wipRoot.child)
        commitEffectHooks()
        currentRoot = wipRoot
        wipRoot = null
        deletions = []
    }

    function commitWork(fiber) {
        if (!fiber) return

        let domParentFiber = fiber.return

        while (!domParentFiber.dom) {
            domParentFiber = domParentFiber.return
        }

        const domParent = domParentFiber.dom
        if (fiber.effectTag === "PLACEMENT" && fiber.dom !== null) {
            domParent.appendChild(fiber.dom)
        } else if (fiber.effectTag === "UPDATE" && fiber.dom !== null) {
            updateDom(fiber.dom, fiber.alternate.props, fiber.props)
        } else if (fiber.effectTag === "DELETION") {
            commitDeletion(fiber, domParent)
        }

        commitWork(fiber.child)
        commitWork(fiber.sibling)
    }

    function commitDeletion(fiber, domParent) {
        if (fiber.dom) {
            domParent.removeChild(fiber.dom)
        } else {
            commitDeletion(fiber.child, domParent)
        }
    }

    function commitEffectHooks() {
        function runCleanup(fiber) {
            if (!fiber) return
            fiber.alternate?.effectHooks?.forEach((action, index) => {
                const deps = fiber.effectHooks[index]?.deps
                if (!action.deps || !isDepsEqual(action.deps, deps)) {
                    action.cleanup?.()
                }
            })
            runCleanup(fiber.child)
            runCleanup(fiber.sibling)
        }


        function run(fiber) {
            if (!fiber) return

            fiber.effectHooks?.forEach((newHook, index) => {
                if (!fiber.alternate) {
                    newHook.cleanup = newHook.callback()
                    return
                }

                if (!newHook.deps) {
                    newHook.cleanup = newHook.callback()
                }

                if (newHook.deps.length > 0) {
                    const oldHook = fiber.alternate.effectHook[index]
                    if (!isDepsEqual(oldHook.deps, newHook.deps)) {
                        newHook.cleanup = newHook.callback()
                    }
                }


            })
            run(fiber.child)
            run(fiber.sibling)

        }

        runCleanup(wipRoot)
        run(wipRoot)

    }

    function isDepsEqual(deps, newDeps) {
        if (deps.length !== newDeps.length) return false

        for (let i = 0; i < deps.length; i++) {
            if (deps[i] !== newDeps[i]) {
                return false
            }
        }
        return true
    }


    function useState(initialState) {
        /* 这个currentfiber 取值的时候 usestate 是在当前的这个函数组件执行的，也就是会拿到当前这个组件的fiber 节点 */
        const currentFiber = wipFiber

        const oldHook = wipFiber.alternate?.stateHooks[stateHooksIndex]

        const stateHook = {
            state: oldHook ? oldHook.state : initialState,
            queue: oldHook ? oldHook.queue : []
        }

        stateHook.queue.forEach(action => {
            stateHook.state = action(stateHook.state)
        })

        stateHook.queue = []
        stateHooksIndex++
        wipFiber.stateHooks.push(stateHook)

        function setState(action) {
            const isFunction = typeof action === "function"
            stateHook.queue.push(isFunction ? action : () => action)

            wipRoot = {
                ...currentFiber,
                alternate: currentFiber
            }

            nextUnitOfWork = wipRoot

        }

        return [stateHook.state, setState]

    }

    function useEffect(callback, deps) {
        const effectHook = {
            callback,
            deps,
            cleanup: undefined,

        }

        wipFiber.effectHooks.push(effectHook)
    }







    const SuperReact = { createElement, render, useEffect, useState }

    window.SuperReact = SuperReact

})();