import { useLocation } from "react-router-dom"

function LogDetails() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const src = params.get("src")
  const dst = params.get("dst")

  return (
    <div className="p-5 text-yellow-400 bg-[#1a1a1a] h-screen">
      <h1 className="text-3xl font-bold mb-4">Log Details</h1>
      <p><strong>Source IP:</strong> {src}</p>
      <p><strong>Destination IP:</strong> {dst}</p>
      {/* Add more detailed data here */}
    </div>
  )
}

export default LogDetails
