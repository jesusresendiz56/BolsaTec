
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home/Home";
import Login from "./pages/login/Login";
import Registro from "./pages/registro/Registro";

// Importar el login del administrador
import AdminLogin from "./pages/admin/AdminLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />

        {/* Nueva ruta del administrador */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
