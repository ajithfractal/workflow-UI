import { useState } from "react"
import { Box, Paper, TextField, Button, Typography, Alert } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { authApi } from "../../api/workflowApi"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError("")

    try {
      await authApi.login(email, password)
      navigate("/") // redirect after login
    } catch (err) {
      setError(err.message || "Login failed")
    }
  }

  return (
    <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Paper sx={{ p: 4, width: 360 }}>
        <Typography variant="h5" mb={2}>Login</Typography>

        {error && <Alert severity="error">{error}</Alert>}

        <form onSubmit={handleLogin}>
          <TextField fullWidth label="Email" margin="normal" value={email} onChange={e=>setEmail(e.target.value)} />
          <TextField fullWidth label="Password" type="password" margin="normal" value={password} onChange={e=>setPassword(e.target.value)} />

          <Button type="submit" fullWidth variant="contained" sx={{ mt:2 }}>
            Login
          </Button>
        </form>
      </Paper>
    </Box>
  )
}