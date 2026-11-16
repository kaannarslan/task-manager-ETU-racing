-- File attachments must point inside their own task's storage folder
-- ("<task_id>/<name>"). Without this, a member could insert a row whose url
-- names another task's object, and an admin deleting the first task would
-- remove that other task's file with admin storage rights.
alter table attachments
  add constraint attachments_file_path_in_task_folder
  check (kind <> 'file' or (
    split_part(url, '/', 1) = task_id::text
    and url ~ '^[0-9a-f-]+/[A-Za-z0-9._-]+$'
    and split_part(url, '/', 2) not like '.%'
  ));
