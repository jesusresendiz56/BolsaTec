
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home/Home";
import Login from "./pages/login/Login";
import Registro from "./pages/registro/Registro";
import TestConexion from "./components/TestConexion";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/test-conexion" element={<TestConexion />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
