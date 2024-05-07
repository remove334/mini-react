"use strict";
function Index() {
    return (MiniReact.createElement("div", null, "Index"));
}
const a = (MiniReact.createElement("div", null,
    MiniReact.createElement("div", null, "23"),
    MiniReact.createElement("ul", null,
        MiniReact.createElement("li", null, "456"))));
console.log(a);
