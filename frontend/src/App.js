import UploadForm from "./components/UploadForm";
import Dashboard from "./components/Dashboard";

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      
      <UploadForm />
      <hr />
      <Dashboard />
    </div>
  );
}

export default App;
