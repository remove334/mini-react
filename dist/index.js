"use strict";
const { render, useState, useEffect } = window.SuperReact;
function App2() {
    return (SuperReact.createElement("div", null, "233"));
}
function App() {
    const [count, setCount] = useState(0);
    function handleClick() {
        setCount((count) => count + 1);
    }
    useEffect(() => {
        // console.log("1234")
        // const timer = setInterval(() => {
        //   setCount((count) => count + 1)
        // }, 1000);
        // return () => clearTimeout(timer);
    }, []);
    return (SuperReact.createElement("div", null,
        SuperReact.createElement("p", null, count),
        SuperReact.createElement("button", { onClick: handleClick }, "\u52A0\u4E00"),
        SuperReact.createElement(App2, null)));
}
render(SuperReact.createElement(App, null), document.getElementById('root'));
