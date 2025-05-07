const Home = () => {
    const handleLogin = () => {
      window.location.href = 'http://localhost:5000/auth/google';
    };
  
    return (
      <div>
        <h1>Simple Task Manager</h1>
        <button onClick={handleLogin}>Sign in with Google</button>
      </div>
    );
  };
  
  export default Home;
  