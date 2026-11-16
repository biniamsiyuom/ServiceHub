import { useEffect, useState } from "react"

interface ServiceRequest {
  id: string
  service: string
  category: string
  requester: string
  status: string
  department?: string
  location?: string
  priority?: string
  comments?: { text: string; author: string; date: string }[]
}

const initialRequests: ServiceRequest[] = [
  {
    id: "SH-001",
    service: "Computer repair",
    category: "IT Support",
    requester: "John Smith",
    department: "Finance",
    location: "Building A",
    priority: "HIGH",
    status: "PENDING",
  },
  {
    id: "SH-002",
    service: "Office cleaning",
    category: "Cleaning",
    requester: "Sarah Johnson",
    department: "Human Resources",
    location: "Building B",
    priority: "LOW",
    status: "IN_PROGRESS",
  },
  {
    id: "SH-003",
    service: "Electrical maintenance",
    category: "Maintenance",
    requester: "Michael Brown",
    department: "Operations",
    location: "Building C",
    priority: "CRITICAL",
    status: "RESOLVED",
  },
  {
    id: "SH-004",
    service: "Internet connection",
    category: "IT Support",
    requester: "David Wilson",
    department: "Administration",
    location: "Building A",
    priority: "MEDIUM",
    status: "PENDING",
  },
]

export default function RequestsPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [priorityFilter, setPriorityFilter] = useState("ALL")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [requestList, setRequestList] = useState<ServiceRequest[]>(() => {
  const savedRequests = localStorage.getItem("servicehub_requests")
  return savedRequests ? JSON.parse(savedRequests) : initialRequests
})
  const [viewingRequest, setViewingRequest] = useState<ServiceRequest | null>(null)
 const [commentText, setCommentText] = useState("")
 useEffect(() => {
  localStorage.setItem("servicehub_requests", JSON.stringify(requestList))

  window.dispatchEvent(
    new Event("servicehub_requests_updated")
  )
}, [requestList])
  function openNewRequest() {
    setEditingId(null)
    setShowForm(true)
  }

  function editRequest(request: ServiceRequest) {
    setEditingId(request.id)
    setShowForm(true)
  }

  function deleteRequest(id: string) {
    setRequestList((current) => current.filter((request) => request.id !== id))
  }

  function updateStatus(id: string, newStatus: string) {
    setRequestList((current) =>
      current.map((request) =>
        request.id === id ? { ...request, status: newStatus } : request
      )
    )
  }

  function addComment() {
    if (!viewingRequest || !commentText.trim()) return

    const newComment = {
      text: commentText.trim(),
      author: "Administrator",
      date: new Date().toISOString(),
    }

    setRequestList((current) =>
      current.map((request) =>
        request.id === viewingRequest.id
          ? {
              ...request,
              comments: [...(request.comments || []), newComment],
            }
          : request
      )
    )

    setViewingRequest((current) =>
      current
        ? {
            ...current,
            comments: [...(current.comments || []), newComment],
          }
        : null
    )

    setCommentText("")
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
  }

  const currentRequest = requestList.find((request) => request.id === editingId)

  const filteredRequests = requestList
    .filter((request) => statusFilter === "ALL" || request.status === statusFilter)
    .filter(
      (request) =>
        priorityFilter === "ALL" || (request.priority || "MEDIUM") === priorityFilter
    )
    .filter((request) => {
      const searchText = search.toLowerCase()
      const values = [
        request.id,
        request.service,
        request.category,
        request.requester,
        request.status,
        request.department || "",
        request.location || "",
        request.priority || "",
      ]

      return values.some((value) => value.toLowerCase().includes(searchText))
    })

  return (
    <section className="content-card">
      <h2 className="section-title">Service Requests</h2>
      <p className="page-subtitle">Manage and track service requests here.</p>

      <div>
        <button type="button" onClick={openNewRequest}>
          + New Request
        </button>
        <input
          type="search"
          placeholder="Search requests..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select>
      </div>
         {viewingRequest && (
  <div className="details-panel">
    <h3>Request Details</h3>
    <p><strong>Request ID:</strong> {viewingRequest.id}</p>
    <p><strong>Service:</strong> {viewingRequest.service}</p>
    <p><strong>Category:</strong> {viewingRequest.category}</p>
    <p><strong>Requester:</strong> {viewingRequest.requester}</p>
    <p><strong>Department:</strong> {viewingRequest.department || "—"}</p>
    <p><strong>Location:</strong> {viewingRequest.location || "—"}</p>
    <p><strong>Priority:</strong> {viewingRequest.priority || "MEDIUM"}</p>
    <p><strong>Status:</strong> {viewingRequest.status}</p>
    <button type="button" onClick={() => setViewingRequest(null)}>
      Close
     </button>
<div>
 {(viewingRequest.comments || []).map((comment, index) => (
  <div key={index}>
    <p><strong>{comment.author}</strong></p>
    <p>{comment.text}</p>
    <small>{new Date(comment.date).toLocaleString()}</small>
  </div>
))}
</div>

<textarea
  placeholder="Write a comment..."
  value={commentText}
  onChange={(event) => setCommentText(event.target.value)}
/>

<button type="button" onClick={addComment}>
  Add Comment
</button>

<button type="button" onClick={() => setViewingRequest(null)}>
  Close
</button>
  </div>
)}

{showForm && (
      
          <form
            onSubmit={(event) => {
              event.preventDefault()
              const data = new FormData(event.currentTarget)
              const requestData = {
  service: String(data.get("service") || ""),
  requester: String(data.get("requester") || ""),
  category: String(data.get("category") || ""),
  department: String(data.get("department") || ""),
  location: String(data.get("location") || ""),
  priority: String(data.get("priority") || "MEDIUM"),
}

         if (editingId) {
                setRequestList((current) =>
                  current.map((request) =>
                    request.id === editingId ? { ...request, ...requestData } : request
                  )
                )
              } else {
                const newRequest: ServiceRequest = {
  id: `SH-${String(requestList.length + 1).padStart(3, "0")}`,
  status: "PENDING",
  ...requestData,
}

const savedNotifications = JSON.parse(
  localStorage.getItem("servicehub_notifications") || "[]"
)

const newNotification = {
  id: Date.now(),
  message: `New request created: ${newRequest.service}`,
  date: new Date().toISOString(),
  read: false,
}

localStorage.setItem(
  "servicehub_notifications",
  JSON.stringify([newNotification, ...savedNotifications])
)
window.dispatchEvent(new Event("servicehub_notifications_updated"))

setRequestList((current) => [newRequest, ...current])
              }

              closeForm()
            }}
          >
            <h3>{editingId ? "Edit Request" : "Create New Request"}</h3>

          <input
            name="service"
            type="text"
            placeholder="Service title"
            defaultValue={currentRequest?.service || ""}
            required
          />
          <input
  name="requester"
  type="text"
  placeholder="Requester name"
  defaultValue={currentRequest?.requester || ""}
  required
/>
          <select
            name="category"
            defaultValue={currentRequest?.category || ""}
            required
          >
            <option value="">Select category</option>
            <option value="IT Support">IT Support</option>
            <option value="Cleaning">Cleaning</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Security">Security</option>
          </select>
          <input
            name="department"
            type="text"
            placeholder="Department"
            defaultValue={currentRequest?.department || ""}
          />
          <input
            name="location"
            type="text"
            placeholder="Location"
            defaultValue={currentRequest?.location || ""}
          />
          <select
            name="priority"
            defaultValue={currentRequest?.priority || "MEDIUM"}
            required
          >
            <option value="">Select priority</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>

          <button type="submit">{editingId ? "Save Changes" : "Create Request"}</button>
          <button type="button" onClick={closeForm}>
            Cancel
          </button>
               </form>
      )}
      <table>
        <thead>
          <tr>
            <th>Request ID</th>
            <th>Service</th>
            <th>Category</th>
            <th>Requester</th>
            <th>Department</th>
            <th>Location</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredRequests.map((request) => (
            <tr key={request.id}>
              <td>{request.id}</td>
              <td>{request.service}</td>
              <td>{request.category}</td>
              <td>{request.requester}</td>
              <td>{request.department ?? "—"}</td>
              <td>{request.location ?? "—"}</td>
              <td>{request.priority ?? "MEDIUM"}</td>
              <td>
                <select
                  value={request.status}
                  onChange={(event) => updateStatus(request.id, event.target.value)}
                >
                  <option value="SUBMITTED">Submitted</option>
                  <option value="PENDING">Pending</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </td>
              <td>
                <button type="button" onClick={() => setViewingRequest(request)}>
              View
               </button>
                <button type="button" onClick={() => editRequest(request)}>
                  Edit
                </button>
                <button type="button" onClick={() => deleteRequest(request.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
