-- Run AFTER you sign up once. Replace the email, then run:
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');

insert into public.books (title, author, description, total_chapters, status) values
 ('The Midnight Library','Matt Haig','Between life and death there is a library.',27,'active_club_read'),
 ('Project Hail Mary','Andy Weir','A lone astronaut must save Earth.',30,'upcoming');

insert into public.nomination_cycles (name) values ('Next Read – Q1');
