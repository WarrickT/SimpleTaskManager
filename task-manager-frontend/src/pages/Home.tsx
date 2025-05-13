const Home = () => {
  const handleLogin = () => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
  };

  return (
    <div className="flex items-center justify-center h-screen bg-background text-lightText font-sans">
      <div className="bg-surface p-16 rounded-3xl shadow-lg text-center">
        <h1 className="text-6xl font-extrabold mb-6">
          This is your
        </h1>
        <h2 className="text-6xl font-extrabold mb-10 flex justify-center leading-tight">
        <span className="bg-gradient-to-r from-purple-500 via-purple-400 to-fuchsia-500 bg-clip-text text-transparent">
            Simple Task Manager
          </span>
          <span className="ml-2 w-4 animate-blink">|</span>
        </h2>
        <button
          onClick={handleLogin}
          className="bg-primary hover:bg-cyan-600 text-white px-10 py-5 rounded-full text-2xl shadow-lg transition duration-200"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Home;
