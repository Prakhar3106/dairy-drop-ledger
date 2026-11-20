
create policy "Dairy photos: centre members and farmers view"
on storage.objects for select to authenticated
using (bucket_id = 'dairy-photos' and (
  public.is_centre_member(public.try_uuid((storage.foldername(name))[1]))
  or public.is_my_farmer_centre(public.try_uuid((storage.foldername(name))[1]))
  or public.is_super_admin()));

create policy "Dairy photos: owners and farmers upload"
on storage.objects for insert to authenticated
with check (bucket_id = 'dairy-photos' and (
  public.is_centre_owner(public.try_uuid((storage.foldername(name))[1]))
  or ((storage.foldername(name))[2] = 'animals' and public.is_my_farmer_centre(public.try_uuid((storage.foldername(name))[1])))));

create policy "Dairy photos: owners and farmers replace"
on storage.objects for update to authenticated
using (bucket_id = 'dairy-photos' and (
  public.is_centre_owner(public.try_uuid((storage.foldername(name))[1]))
  or ((storage.foldername(name))[2] = 'animals' and owner = auth.uid())));

create policy "Dairy photos: owners and uploaders delete"
on storage.objects for delete to authenticated
using (bucket_id = 'dairy-photos' and (
  public.is_centre_owner(public.try_uuid((storage.foldername(name))[1])) or owner = auth.uid()));
