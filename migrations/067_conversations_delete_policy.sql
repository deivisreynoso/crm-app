-- Allow workspace members to delete conversation threads (messages cascade).

CREATE POLICY conversations_delete ON conversations
  FOR DELETE USING (finance_actor_in_workspace(user_id));
