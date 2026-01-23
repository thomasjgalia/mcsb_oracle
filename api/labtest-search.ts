// ============================================================================
// API Endpoint: Lab Test Search (Measurement Domain)
// ============================================================================
// Vercel Serverless Function
// Endpoint: POST /api/labtest-search
// ============================================================================
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  executeQuery,
  createErrorResponse,
} from './lib/azuresql.js';

interface LabTestSearchRequest {
  searchterm: string;
}

interface LabTestSearchResult {
  lab_test_type: string;
  term_concept: number;
  search_result: string;
  searched_code: string;
  searched_concept_class_id: string;
  vocabulary_id: string;
  property: string | null;
  scale: string | null;
  system: string | null;
  time: string | null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('=== Lab Test Search API called ===');
  console.log('Method:', req.method);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Method not allowed', 405));
  }

  try {
    const { searchterm } = req.body as LabTestSearchRequest;
    console.log('Lab Test Search params:', { searchterm });

    // Validate input - allow empty searchterm for full list
    const searchValue = searchterm?.trim() || '';

    // Build the SQL query (converted from Snowflake to T-SQL)
    const sql = `
      WITH base AS (
        -- Scope from the start: Measurement domain, LOINC/CPT4/HCPCS vocabularies
        SELECT
          CONCEPT_ID,
          CONCEPT_NAME,
          CONCEPT_CODE,
          CONCEPT_CLASS_ID,
          VOCABULARY_ID
        FROM CONCEPT
        WHERE DOMAIN_ID = 'Measurement'
          AND VOCABULARY_ID IN ('LOINC', 'CPT4', 'HCPCS', 'SNOMED')
          AND (
            (VOCABULARY_ID = 'LOINC' AND CONCEPT_CLASS_ID = 'Lab Test')
            OR VOCABULARY_ID = 'CPT4'
            OR VOCABULARY_ID = 'SNOMED'
            OR (VOCABULARY_ID = 'HCPCS' AND CONCEPT_CLASS_ID = 'HCPCS')
          )
          AND (
            @searchterm = ''
            OR UPPER(CAST(CONCEPT_ID AS NVARCHAR(30)) + ' ' + CONCEPT_CODE + ' ' + CONCEPT_NAME)
               LIKE '%' + UPPER(@searchterm) + '%'
          )
      ),
      prop AS (
        SELECT CONCEPT_ID_1, CONCEPT_ID_2
        FROM CONCEPT_RELATIONSHIP
        WHERE RELATIONSHIP_ID = 'Has property'
      ),
      scale AS (
        SELECT CONCEPT_ID_1, CONCEPT_ID_2
        FROM CONCEPT_RELATIONSHIP
        WHERE RELATIONSHIP_ID = 'Has scale type'
      ),
      sys AS (
        SELECT CONCEPT_ID_1, CONCEPT_ID_2
        FROM CONCEPT_RELATIONSHIP
        WHERE RELATIONSHIP_ID = 'Has system'
      ),
      tm AS (
        SELECT CONCEPT_ID_1, CONCEPT_ID_2
        FROM CONCEPT_RELATIONSHIP
        WHERE RELATIONSHIP_ID = 'Has time aspect'
      ),
      panel AS (
        -- For each lab test (concept_id_1), get the panel concept (concept_id_2)
        SELECT
          CR.CONCEPT_ID_1,
          CR.CONCEPT_ID_2,
          C.CONCEPT_ID   AS PANEL_CONCEPT_ID,
          C.CONCEPT_NAME AS PANEL_CONCEPT_NAME,
          C.CONCEPT_CODE AS PANEL_CONCEPT_CODE
        FROM CONCEPT_RELATIONSHIP CR
        JOIN CONCEPT C ON C.CONCEPT_ID = CR.CONCEPT_ID_2
        WHERE CR.RELATIONSHIP_ID = 'Contained in panel'
      ),
      term AS (
        SELECT
          'Lab Test' AS lab_test_type,
          b.CONCEPT_ID        AS term_concept,
          b.CONCEPT_NAME      AS search_result,
          b.CONCEPT_CODE      AS searched_code,
          b.CONCEPT_CLASS_ID  AS searched_concept_class_id,
          b.VOCABULARY_ID     AS vocabulary_id,
          p_c.CONCEPT_NAME    AS property,
          sc_c.CONCEPT_NAME   AS scale,
          sy_c.CONCEPT_NAME   AS system,
          t_c.CONCEPT_NAME    AS time
        FROM base b
        LEFT JOIN prop p           ON p.CONCEPT_ID_1 = b.CONCEPT_ID
        LEFT JOIN CONCEPT p_c      ON p_c.CONCEPT_ID = p.CONCEPT_ID_2
                                      AND (p_c.INVALID_REASON IS NULL OR p_c.INVALID_REASON = '')
        LEFT JOIN scale s          ON s.CONCEPT_ID_1 = b.CONCEPT_ID
        LEFT JOIN CONCEPT sc_c     ON sc_c.CONCEPT_ID = s.CONCEPT_ID_2
                                      AND (sc_c.INVALID_REASON IS NULL OR sc_c.INVALID_REASON = '')
        LEFT JOIN sys sy           ON sy.CONCEPT_ID_1 = b.CONCEPT_ID
        LEFT JOIN CONCEPT sy_c     ON sy_c.CONCEPT_ID = sy.CONCEPT_ID_2
                                      AND (sy_c.INVALID_REASON IS NULL OR sy_c.INVALID_REASON = '')
        LEFT JOIN tm t             ON t.CONCEPT_ID_1 = b.CONCEPT_ID
        LEFT JOIN CONCEPT t_c      ON t_c.CONCEPT_ID = t.CONCEPT_ID_2
                                      AND (t_c.INVALID_REASON IS NULL OR t_c.INVALID_REASON = '')
      ),
      LOINCpanel AS (
        SELECT
          'Panel' AS lab_test_type,
          C.CONCEPT_ID            AS term_concept,
          C.CONCEPT_NAME          AS search_result,
          C.CONCEPT_CODE          AS searched_code,
          C.CONCEPT_CLASS_ID      AS searched_concept_class_id,
          C.VOCABULARY_ID         AS vocabulary_id,
          NULL        AS property,
          NULL        AS scale,
          NULL        AS system,
          NULL        AS time
        FROM CONCEPT C
        JOIN term T ON T.term_concept IN (
          SELECT CONCEPT_ID_1 FROM panel WHERE PANEL_CONCEPT_ID = C.CONCEPT_ID
        )
        WHERE C.VOCABULARY_ID = 'LOINC'
        GROUP BY C.CONCEPT_ID, C.CONCEPT_NAME, C.CONCEPT_CODE, C.CONCEPT_CLASS_ID, C.VOCABULARY_ID
      )
      SELECT TOP 1000 * FROM term
      UNION ALL
      SELECT * FROM LOINCpanel
      ORDER BY vocabulary_id, term_concept ASC
    `;

    // Execute query
    const results = await executeQuery<LabTestSearchResult>(sql, {
      searchterm: searchValue,
    });

    console.log('📤 Sending lab test search response with', results.length, 'results');
    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Lab Test Search API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
}
