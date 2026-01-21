
/* **************************************************************
   Step 3A — Direct Build
   ************************************************************** */

-- Select database/schema
SET db  = 'UDP_QA_REF_DATA';
SET sch = 'LSMI_OMOP';
USE DATABASE IDENTIFIER($db);
USE SCHEMA   IDENTIFIER($sch);

-- Inputs
SET concept = 378427;           -- HIERARCHY_CONCEPT_ID from Step 2
SET domain_id = (SELECT DOMAIN_ID FROM CONCEPT WHERE CONCEPT_ID = $concept);

-- Build descendants mapped to standard codes with dose-form labeling and combo flag
SELECT
  C.CONCEPT_NAME        AS ROOT_CONCEPT_NAME,
  C.VOCABULARY_ID       AS CHILD_VOCABULARY_ID,
  C.CONCEPT_CODE        AS CHILD_CODE,
  C.CONCEPT_NAME        AS CHILD_NAME,
  C.CONCEPT_ID          AS CHILD_CONCEPT_ID,
  C.CONCEPT_CLASS_ID,
  NULL                  AS COMBINATIONYESNO,
  NULL                  AS DOSE_FORM,
  NULL                  AS DFG_NAME
FROM CONCEPT C
WHERE C.CONCEPT_ID = $concept
ORDER BY C.VOCABULARY_ID DESC, C.CONCEPT_CODE;
