import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { AssignmentWithPoster, Assignment } from "../types";
import Spinner from "./Spinner";
import { Link } from "react-router-dom";
import PostAssignmentModal from "./PostAssignmentModal";
import { format } from "date-fns";
import { useAuth } from "../hooks/useAuth";

const AssignmentCard: React.FC<{
  assignment: AssignmentWithPoster;
  onComplete?: (id: number) => void;
  userId?: string;
}> = ({ assignment, onComplete, userId }) => (
  <div className="relative">
    <Link
      to={`/assignment/${assignment.id}`}
      className="block p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all duration-300 transform hover:scale-[1.02]"
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-text-heading">{assignment.title}</h4>
          <p className="text-xs text-text-muted mt-1">
            from {assignment.college}
          </p>
        </div>
        <span className="text-sm font-bold text-green-600">
          ₹{assignment.price}
        </span>
      </div>
      <p className="text-sm text-text-body mt-2 h-10 overflow-hidden">
        {assignment.description}
      </p>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-text-muted font-semibold">
          Due:{" "}
          {assignment.due_date
            ? format(new Date(assignment.due_date), "MMM d, yyyy")
            : "N/A"}
        </p>
        <p className="text-xs text-text-muted">
          {assignment.status === "open"
            ? "Posted by " + assignment.profiles.name.split(" ")[0]
            : assignment.status === "in_progress"
            ? "Assigned to " +
              (assignment.assignee?.name.split(" ")[0] || "Unknown")
            : assignment.status === "submitted"
            ? "Submitted by " +
              (assignment.assignee?.name.split(" ")[0] || "Unknown")
            : "Completed"}
        </p>
      </div>
    </Link>
    {assignment.status === "submitted" &&
      assignment.poster_id === userId &&
      onComplete && (
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onComplete(assignment.id);
            }}
            className="bg-green-500 text-white px-3 py-2 text-sm rounded-md hover:bg-green-600 transition-colors font-semibold"
          >
            Mark Complete
          </button>
        </div>
      )}
  </div>
);

const AssignmentsTab: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithPoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assignments")
      .select("*, profiles:poster_id(*), assignee:assignee_id(*)")
      .in("status", ["open", "in_progress", "submitted"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching assignments:", error);
    } else if (data) {
      setAssignments(data as any);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("public:assignments")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assignments" },
        (payload) => {
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAssignments]);

  const handleMarkComplete = async (assignmentId: number) => {
    if (!user) return;
    const { error } = await (supabase.from("assignments") as any)
      .update({ status: "completed" })
      .eq("id", assignmentId)
      .eq("poster_id", user.id);

    if (error) {
      console.error("Error marking assignment as complete:", error);
      alert("Failed to mark assignment as complete. Please try again.");
    } else {
      fetchAssignments(); 
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  return (
    <div className="space-y-6 p-2">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-text-heading">
          Assignment Marketplace
        </h2>
        <button
          onClick={() => setIsPostModalOpen(true)}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-focus transition-colors font-semibold shadow-soft text-sm"
        >
          Post an Assignment
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : assignments.length === 0 ? (
        <div className="text-center text-gray-500 py-10 bg-slate-50 rounded-xl">
          No assignments available right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              onComplete={handleMarkComplete}
              userId={user?.id}
            />
          ))}
        </div>
      )}

      {isPostModalOpen && (
        <PostAssignmentModal
          onClose={() => setIsPostModalOpen(false)}
          onSuccess={() => {
            setIsPostModalOpen(false);
            fetchAssignments();
          }}
        />
      )}
    </div>
  );
};

export default AssignmentsTab;
