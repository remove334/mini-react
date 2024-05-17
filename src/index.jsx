const { render, useState, useEffect } = window.SuperReact;


function App2(){
  return (
    <div>
      233
    </div>
  )
}


function App() {
  const [count, setCount] = useState(0)

  function handleClick() {
    setCount((count) => count + 1)
  }

  useEffect(() => {
    // console.log("1234")
    // const timer = setInterval(() => {
    //   setCount((count) => count + 1)
    // }, 1000);
    // return () => clearTimeout(timer);
  }, []);


  return (
    <div>
      <span></span>
      <p>{count}</p>
      <button onClick={handleClick}>加一</button>
      <App2/>
    </div>
  );
}

render(<App />, document.getElementById('root'));