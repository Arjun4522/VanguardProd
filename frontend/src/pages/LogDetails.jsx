import { useLocation, useNavigate } from "react-router-dom"

function LogDetails() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)

  const src = params.get("src")
  const dst = params.get("dst")
  const protocol = params.get("protocol")
  const timestamp = params.get("timestamp")

  const navigate = useNavigate()

  const handleBackClick = () => {
    navigate(-1) // Go back to the previous page
  }

  return (
    <div className="p-5 text-yellow-400 bg-[#1a1a1a] min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center">Log Details</h1>
      
      {/* Back Button */}
      <button 
        onClick={handleBackClick} 
        className="absolute right-5 top-5 text-yellow-400 hover:text-yellow-500 bg-gray-400/20 rounded-full p-2 shadow-md hover:shadow-yellow-400/20 transform hover:scale-[1.02] transition-all duration-300"
      >
        &#8592; Back
      </button>
      
      <div className="bg-[#2a2a2a] border border-yellow-500/20 rounded-xl p-6 max-w-2xl mx-auto shadow-lg">
        <p className="mb-3"><strong className="text-yellow-300">Source IP:</strong> {src}</p>
        <p className="mb-3"><strong className="text-yellow-300">Destination IP:</strong> {dst}</p>
        <p className="mb-3"><strong className="text-yellow-300">Protocol:</strong> {protocol}</p>
        <p><strong className="text-yellow-300">Timestamp:</strong> {new Date(timestamp).toLocaleString()}</p>
      </div>
    </div>
  )
}

export default LogDetails
