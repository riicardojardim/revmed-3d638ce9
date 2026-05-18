
REVOKE EXECUTE ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_friend_request(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_room_invite(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_room_invite(uuid, uuid, uuid) TO authenticated;
