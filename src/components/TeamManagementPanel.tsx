import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Save, Edit2 } from 'lucide-react';
import { Team, Event, Profile } from '../types/database';
import { addTeamMember, removeTeamMember } from '../api/teamMembers';
import { assignPlayerToEvent } from '../api/teamEventAssignments';
import { useAuthStore } from '../store/authStore';
import CustomAvatar from '../components/CustomAvatar';
import Select from 'react-select';

interface TeamManagementPanelProps {
  team: Team;
  events: Event[];
  onTeamUpdated: () => void;
  onTeamDeleted: () => void;
}

interface TeamMember {
  team_id: string;
  player_id: string;
  joined_at?: string;
  player?: Profile;
}

interface Assignment {
  event_id: string;
  player_id: string;
}

interface EventWithLock extends Event {
  locked_at?: string | null;
}

export default function TeamManagementPanel({
  team,
  events,
  onTeamUpdated,
  onTeamDeleted,
}: TeamManagementPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingAssignments, setEditingAssignments] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Initialize assignments from team data
  useEffect(() => {
    if (team.assignments) {
      const initialAssignments = team.assignments
        .filter(assignment => assignment.event_id && assignment.player_id)
        .map(assignment => ({
          event_id: assignment.event_id,
          player_id: assignment.player_id
        }));
      setAssignments(initialAssignments);
    }
  }, [team.assignments]);

  // Check if the current user is a member of the team
  const isUserInTeam = user && team.members?.some(member => member.player?.id === user.id);
  const isUserTeamCreator = user && team.created_by === user.id;

  const handleJoinTeam = async () => {
    if (!user) return;
    setError(null);
    setLoading(true);

    try {
      await addTeamMember(team.id, user.id);
      onTeamUpdated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to leave this team?')) return;
    
    setError(null);
    setLoading(true);

    try {
      await removeTeamMember(team.id, user.id);
      onTeamUpdated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!member.player?.id) {
      setError('Invalid player');
      return;
    }

    if (!window.confirm('Are you sure you want to remove this member?')) return;
    setError(null);
    setLoading(true);

    try {
      await removeTeamMember(team.id, member.player.id);
      onTeamUpdated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentChange = (eventId: string, playerId: string) => {
    setAssignments(prev => {
      // Create a new array with all assignments except the one being updated
      const newAssignments = prev.filter(a => a.event_id !== eventId);
      // Add the new assignment if a player was selected
      if (playerId) {
        newAssignments.push({ event_id: eventId, player_id: playerId });
      }
      return newAssignments;
    });
  };

  const handleSaveAssignments = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Filter out any assignments where player_id is empty
      const validAssignments = assignments.filter(a => a.player_id);
      
      // Save each valid assignment
      for (const assignment of validAssignments) {
        await assignPlayerToEvent(team.id, assignment.event_id, assignment.player_id);
      }
      
      setSuccess('Assignments saved successfully');
      setEditingAssignments(false);
      onTeamUpdated();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAssignments = () => {
    if (team.assignments) {
      const currentAssignments = team.assignments
        .filter(assignment => assignment.event_id && assignment.player_id)
        .map(assignment => ({
          event_id: assignment.event_id,
          player_id: assignment.player_id
        }));
      setAssignments(currentAssignments);
    } else {
      setAssignments([]);
    }
    setEditingAssignments(false);
    setError(null);
    
    setSuccess(null);
  };

  const getCurrentAssignment = (eventId: string) => {
    // First check the current assignments state for pending changes
    const pendingAssignment = assignments.find(a => a.event_id === eventId);
    if (pendingAssignment) {
      const player = team.members?.find(m => m.player?.id === pendingAssignment.player_id)?.player;
      if (player) {
        return {
          value: player.id,
          label: player.full_name || player.username
        };
      }
    }

    // If no pending assignment, check the saved assignments
    const savedAssignment = team.assignments?.find(a => a.event?.id === eventId);
    if (savedAssignment?.player) {
      return {
        value: savedAssignment.player.id,
        label: savedAssignment.player.full_name || savedAssignment.player.username
      };
    }

    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Users className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">{team.name}</h3>
          </div>
          <div className="flex items-center space-x-4">
            {!isUserInTeam && (
              <button
                onClick={handleJoinTeam}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Join Team
              </button>
            )}
            {isUserInTeam && !isUserTeamCreator && (
              <button
                onClick={handleLeaveTeam}
                disabled={loading}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                <UserMinus className="h-4 w-4 mr-1" />
                Leave Team
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-red-100 border-b border-red-200">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="px-6 py-4 bg-green-100 border-b border-green-200">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="space-y-6">
          {/* Team Members Section */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Team Members</h4>
            {team.members && team.members.length > 0 ? (
              <div className="space-y-2">
                {team.members.map((member) => (
                  <div
                    key={member.player?.id}
                    className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center">
                      <CustomAvatar
                        shape={member.player?.avatar_shape}
                        foregroundColor={member.player?.avatar_foreground_color}
                        backgroundColor={member.player?.avatar_background_color}
                        size="small"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900">
                        {member.player?.full_name || member.player?.username}
                      </span>
                    </div>
                    {isUserTeamCreator && member.player?.id !== user?.id && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
                      >
                        <UserMinus className="h-5 w-5" />
                      </button>
                    )}
                    {!isUserTeamCreator && user?.id === member.player?.id && (
                      <button
                        onClick={() => handleRemoveMember(member)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-900"
                      >
                        <UserMinus className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No team members yet</div>
            )}
          </div>

          {/* Category Assignments Section */}
          {isUserInTeam && team.members && team.members.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-medium text-gray-700">Category Assignments</h4>
                {!editingAssignments && isUserTeamCreator && isUserInTeam && (
                  <button
                    onClick={() => setEditingAssignments(true)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit Assignments
                  </button>
                )}
              </div>
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                {events.map((event) => {
                  const isLocked = event.locked_at !== null && event.locked_at !== undefined;
                  console.log(`Event ${event.name}:`, {
                    id: event.id,
                    locked_at: event.locked_at,
                    isLocked: isLocked
                  });
                  return (
                    <div key={event.id} className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{event.name}</h5>
                        {event.description && (
                          <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        {editingAssignments ? (
                          <Select
                            className="w-full sm:w-64"
                            value={getCurrentAssignment(event.id)}
                            onChange={(option: any) => {
                              handleAssignmentChange(event.id, option ? option.value : '');
                            }}
                            options={team.members?.map(member => ({
                              value: member.player?.id || '',
                              label: member.player?.full_name || member.player?.username || ''
                            })) || []}
                            isClearable
                            isDisabled={loading || isLocked}
                            placeholder="Select player"
                          />
                        ) : (
                          <div className="text-sm">
                            {getCurrentAssignment(event.id) ? (
                              <span className="font-medium text-gray-900">
                                {getCurrentAssignment(event.id)?.label}
                              </span>
                            ) : (
                              <span className="text-gray-500">Unassigned</span>
                            )}
                          </div>
                        )}
                        {isLocked && (
                          <span className="text-xs text-gray-500">(Locked)</span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {editingAssignments && (
                  <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                    <button
                      onClick={handleCancelAssignments}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAssignments}
                      disabled={loading}
                      className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}