const Home = () => {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  const handleSignIn = () => {
    // Redirect to the FastAPI endpoint for Google login
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-8 bg-gray-800 rounded-2xl shadow-lg border border-gray-700 max-w-lg mx-4">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Welcome to Your Goal Tracker
        </h1>
        <p className="text-gray-300 text-lg mb-8">
          Seamlessly manage your goals and track your progress in one place.
          Sign in to get started.
        </p>
        <button
          onClick={handleSignIn}
          className="w-full sm:w-auto px-8 py-3 bg-white text-gray-900 font-bold rounded-full shadow-lg hover:bg-gray-200 transition-all duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
        >
          Sign In with Google
        </button>
      </div>
    </div>
  );
};

export default Home;
