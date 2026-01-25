DECLARE @searchterm nvarchar(100) = 'calcium';

with base as (  -- ~scopes from the start
  select concept_id std_concept_id, concept_name, concept_code, concept_class_id, vocabulary_id
  from concept
  where domain_id = 'Measurement'
    AND vocabulary_id in ('LOINC', 'CPT4', 'HCPCS','SNOMED') -- AND CONCEPT_CLASS_ID = 'Lab Test'
    AND (
          (vocabulary_id = 'LOINC' AND concept_class_id = 'Lab Test')
       OR (vocabulary_id = 'CPT4')
       OR (vocabulary_id = 'SNOMED')
       OR (vocabulary_id = 'HCPCS' AND concept_class_id = 'HCPCS')
        )
    and (
          convert(varchar(50), concept_id) + ' ' + upper(concept_code) + ' ' + upper(concept_name)
        ) like '%' + upper('calcium') + '%'
)
,
  prop as (
    select concept_id_1 std_concept_id, concept_id_2
	from concept_relationship join base on base.std_concept_id = concept_id_1
	where relationship_id = 'has property'
  ),
  scale as (
    select concept_id_1 std_concept_id, concept_id_2
    from concept_relationship join base on base.std_concept_id = concept_id_1
    where relationship_id = 'has scale type'
  ),
  sys as (
    select concept_id_1 std_concept_id, concept_id_2
    from concept_relationship join base on base.std_concept_id = concept_id_1
    where relationship_id = 'has system'
  ),
  tm as (
    select concept_id_1 std_concept_id, concept_id_2
    from concept_relationship join base on base.std_concept_id = concept_id_1
    where relationship_id = 'has time aspect'
      ),
  term_raw as (
    select
      'lab test' as lab_test_type,
      b.std_concept_id        as std_concept_id,
      b.concept_name      as search_result,
      b.concept_code      as searched_code,
      b.concept_class_id  as searched_concept_class_id,
      b.vocabulary_id     as vocabulary_id,
      p_c.concept_name    as property,
      sc_c.concept_name   as scale,
      sy_c.concept_name   as system,
      t_c.concept_name    as time--,
--      pn.panel_concept_id as panel_concept_id,
--      pn.panel_concept_code as panel_code,
--      pn.panel_concept_name as panel_name
    from base b
    left join prop p on p.std_concept_id = b.std_concept_id
    left join concept p_c on p_c.concept_id = p.concept_id_2 and coalesce(p_c.invalid_reason,'') = ''
    left join scale s on s.std_concept_id = b.std_concept_id
    left join concept sc_c on sc_c.concept_id = s.concept_id_2 and coalesce(sc_c.invalid_reason,'') = ''
    left join sys sy on sy.std_concept_id = b.std_concept_id
    left join concept sy_c on sy_c.concept_id = sy.concept_id_2 and coalesce(sy_c.invalid_reason,'') = ''
    left join tm t on t.std_concept_id = b.std_concept_id
    left join concept t_c on t_c.concept_id = t.concept_id_2 and coalesce(t_c.invalid_reason,'') = ''
  )
,
  term as (
    select
      lab_test_type,
      std_concept_id,
      search_result,
      searched_code,
      searched_concept_class_id,
      vocabulary_id,
      string_agg(property, ', ') as property,
      string_agg(scale, ', ') as scale,
      string_agg(system, ', ') as system,
      string_agg(time, ', ') as time--,
    from term_raw
    group by
      lab_test_type,
      std_concept_id,
      search_result,
      searched_code,
      searched_concept_class_id,
      vocabulary_id--,
  )

      select * from term
      order by vocabulary_id, std_concept_id asc
      ;