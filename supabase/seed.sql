-- Optional local development seed. It only works AFTER you have signed up at
-- least one real user through Supabase Auth (the frontend's /register page,
-- or `supabase auth users create` locally) — auth.users rows can't be
-- created safely from plain SQL. Replace the UUID below with that user's id
-- (Supabase Studio > Authentication > Users, or `select id, email from
-- auth.users;`) before running this file.
--
--   supabase db execute -f supabase/seed.sql
--
-- Everything here is idempotent-ish for a single run against a fresh plan;
-- re-running will error on the unique (learning_plan_id, day_number) and
-- (lesson_section_id, order_index) constraints, which is intentional so you
-- don't accidentally double-seed.

do $$
declare
  demo_user_id uuid := '00000000-0000-0000-0000-000000000000'; -- <-- replace me
  new_plan_id uuid;
  day1_id uuid;
  lesson1_id uuid;
  vocab_section_id uuid;
  grammar_section_id uuid;
begin
  if demo_user_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Edit supabase/seed.sql and set demo_user_id to a real auth.users.id before running.';
  end if;

  insert into public.learning_plans (user_id, title, total_days, start_date, target_level_start, target_level_end, generated_by)
  values (demo_user_id, 'Programa de 90 días — Inglés para tecnología', 90, current_date, 'A2', 'B2', 'template')
  returning id into new_plan_id;

  update public.profiles set current_plan_id = new_plan_id, current_level = 'A2' where id = demo_user_id;

  insert into public.plan_days (user_id, learning_plan_id, day_number, day_type, status, unlocked_at)
  values (demo_user_id, new_plan_id, 1, 'lesson', 'available', now())
  returning id into day1_id;

  insert into public.plan_days (user_id, learning_plan_id, day_number, day_type, status)
  select demo_user_id, new_plan_id, day_number, 'lesson', 'locked'
  from generate_series(2, 90) as day_number;

  insert into public.lessons (user_id, plan_day_id, title, objective, cefr_level)
  values (demo_user_id, day1_id, 'Día 1: Presentándote en el trabajo', 'Aprender a presentarte en una reunión de trabajo en inglés.', 'A2')
  returning id into lesson1_id;

  update public.plan_days set lesson_id = lesson1_id where id = day1_id;

  insert into public.lesson_sections (user_id, lesson_id, section_type, order_index, title, content)
  values (
    demo_user_id, lesson1_id, 'vocabulary', 0, 'Vocabulario: presentaciones',
    jsonb_build_object(
      'explanation', 'Estas son frases comunes para presentarte en un entorno laboral en inglés.',
      'vocabulary', jsonb_build_array(
        jsonb_build_object('term', 'I work as a...', 'translation', 'Trabajo como...', 'example', 'I work as a backend developer.'),
        jsonb_build_object('term', 'I''m in charge of...', 'translation', 'Estoy a cargo de...', 'example', 'I''m in charge of the API team.')
      )
    )
  ) returning id into vocab_section_id;

  insert into public.lesson_sections (user_id, lesson_id, section_type, order_index, title, content)
  values (
    demo_user_id, lesson1_id, 'grammar', 1, 'Gramática: remote vs remotely',
    jsonb_build_object(
      'explanation', '"Remote" es un adjetivo y describe un sustantivo (a remote job). "Remotely" es un adverbio y describe un verbo (I work remotely).',
      'examples', jsonb_build_array('I have a remote job.', 'I work remotely most days.')
    )
  ) returning id into grammar_section_id;

  insert into public.lesson_sections (user_id, lesson_id, section_type, order_index, title, content)
  values (
    demo_user_id, lesson1_id, 'interactive', 2, 'Practicá lo aprendido', '{}'::jsonb
  );

  insert into public.exercises (user_id, lesson_section_id, exercise_type, order_index, content, answer_key)
  values (
    demo_user_id, vocab_section_id, 'multiple_choice', 0,
    jsonb_build_object('prompt', 'Which sentence correctly introduces your job?', 'options', jsonb_build_array(
      'I work as a software developer.', 'I working like software developer.', 'I job software developer.'
    )),
    jsonb_build_object('correctOptionIndex', 0)
  );

  insert into public.exercises (user_id, lesson_section_id, exercise_type, order_index, content, answer_key)
  values (
    demo_user_id, grammar_section_id, 'fill_in_blank', 0,
    jsonb_build_object('prompt', 'I work _____ (remote/remotely) most days.'),
    jsonb_build_object('acceptedAnswers', jsonb_build_array('remotely'))
  );

  insert into public.exercises (
    user_id, lesson_section_id, exercise_type, order_index, content, answer_key
  ) values (
    demo_user_id,
    (select id from public.lesson_sections where lesson_id = lesson1_id and order_index = 2),
    'free_writing', 0,
    jsonb_build_object('prompt', 'Write 2-3 sentences introducing yourself and your job to a new coworker.', 'minWords', 15),
    '{}'::jsonb
  );
end $$;
