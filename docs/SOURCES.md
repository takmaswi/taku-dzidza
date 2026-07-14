# TAKU-Dzidza sources appendix

Compiled 14 July 2026 from a multi-agent research pass (web search plus source fetches). Items marked [UNVERIFIED] could not be confirmed against a primary source and should be re-checked before being quoted externally.

## Learning science and AI tutoring evidence

- Bastani et al., "Generative AI without guardrails can harm learning," PNAS 122(26), 2025. Raw GPT-4: +48% assisted practice, -17% unaided exam; hint-only tutor removed the harm. https://www.pnas.org/doi/10.1073/pnas.2422633122 (earlier preprint: https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4895486)
- Kestin et al., AI tutor vs active learning RCT, Scientific Reports, 2025. N=194, about 30% higher post-test in about 35% less time. https://www.nature.com/articles/s41598-025-97652-6
- UK RCT: LearnLM at parity with human tutors, small edge on independent problem solving. https://arxiv.org/html/2512.23633v1
- VanLehn, "The relative effectiveness of human tutoring, intelligent tutoring systems...", 2011. Human d=0.79, step-based ITS d=0.76. https://www.semanticscholar.org/paper/3b924661db089b3511465ae48e6400e20a1dd232
- Kulik and Fletcher, ITS meta-analysis, Review of Educational Research, 2016. Median d=0.66 across 50 studies. https://journals.sagepub.com/doi/abs/10.3102/0034654315581420
- Self-explanation meta-analysis (64 studies, g=0.66). https://www.bps.org.uk/research-digest/self-explanation-powerful-learning-technique-according-meta-analysis-64-studies
- Cepeda et al., spacing meta-analysis, 2006. https://augmentingcognition.com/assets/Cepeda2006.pdf
- Kapur, productive failure. https://link.springer.com/article/10.1007/s11251-012-9235-4
- Koedinger and Aleven, the assistance dilemma, 2007. https://link.springer.com/article/10.1007/s10648-007-9049-0
- Kalyuga et al., expertise reversal effect. https://www.tandfonline.com/doi/abs/10.1207/S15326985EP3801_4
- Baker et al., gaming-the-system detection. https://learninganalytics.upenn.edu/ryanbaker/BakerSiemensHandbook2013.pdf
- SafeTutors pedagogical-safety benchmark, 2026. https://arxiv.org/pdf/2603.17373
- Answer-leakage robustness training, ACL 2026. https://aclanthology.org/2026.acl-long.1412/
- Microsoft Research and CMU, GenAI and critical thinking, CHI 2025. https://dl.acm.org/doi/full/10.1145/3706598.3713778
- MIT Media Lab, "Your Brain on ChatGPT," 2025 preprint. Not peer-reviewed; treat as corroborating only. https://www.media.mit.edu/publications/your-brain-on-chatgpt/
- Khanmigo design and guardrails. https://www.khanmigo.ai/parents
- Rori (Rising Academies) WhatsApp maths tutor results, about 0.3 SD. https://learning-engineering-virtual-institute.org/rising-academys-rori-ai-chatbot-it-has-built-my-confidence/
- Nigeria Edo State GPT-4 tutoring pilot, World Bank. https://blogs.worldbank.org/en/education/From-chalkboards-to-chatbots-in-Nigeria
- LearnLM technical report (pedagogy fine-tuning recipe). https://arxiv.org/pdf/2412.16429
- SocraticLM (NeurIPS 2024). http://staff.ustc.edu.cn/~huangzhy/files/papers/JiayuLiu-NeurIPS2024.pdf
- PhET simulations (offline-capable HTML5, accessibility). https://phet.colorado.edu/
- Brilliant interactive-first lesson design. https://brilliant.org/
- Rive vs Lottie animation performance on mobile. https://www.callstack.com/blog/lottie-vs-rive-optimizing-mobile-app-animation

## On-device models and inference

- llama.cpp. https://github.com/ggml-org/llama.cpp
- ExecuTorch 1.0 GA. https://newsroom.arm.com/news/executorch-1-0-ga-release-edge-ai and https://pytorch.org/blog/introducing-executorch-1-0/
- React Native ExecuTorch (Software Mansion). https://github.com/software-mansion/react-native-executorch
- LiteRT-LM (successor to MediaPipe LLM Inference, which is maintenance-only). https://developers.googleblog.com/blazing-fast-on-device-genai-with-litert-lm/ and https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference
- Cactus Compute. https://github.com/cactus-compute/cactus and https://cactuscompute.com/blog/lfm2-5-350m [UNVERIFIED: license terms and .cact format status; verify in writing before any commitment]
- Qwen3 family (Apache 2.0). https://huggingface.co/Qwen/Qwen3-4B
- Gemma 4 E2B/E4B, Apache 2.0, March 2026. https://opensource.googleblog.com/2026/03/gemma-4-expanding-the-gemmaverse-with-apache-20.html
- Phi-4-mini-reasoning (MIT). https://arxiv.org/pdf/2504.21233
- SmolLM3-3B (Apache 2.0, open recipe). https://huggingface.co/HuggingFaceTB/SmolLM3-3B
- DeepSeek-R1-Distill-Qwen-1.5B. https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B
- AfriqueQwen3.5-4B-50Langs (McGill NLP; Shona coverage unconfirmed). https://huggingface.co/McGill-NLP/AfriqueQwen3.5-4B-50Langs
- InkubaLM (Lelapa AI; no Shona/Ndebele). https://arxiv.org/html/2408.17024v1
- sqlite-vec (on-device vector search). https://github.com/asg017/sqlite-vec
- KV-cache quantization on constrained devices. https://arxiv.org/abs/2604.04722
- ML Kit text recognition. https://developers.google.com/ml-kit/vision/text-recognition/v2/android
- mathsteps (step-by-step solver, from Socratic). https://medium.com/building-socratic/stepping-into-math-open-sourcing-our-step-by-step-solver-9b5da066ae36
- nerdamer (JS CAS). https://nerdamer.com/

## Trust stack techniques

- RAG plus fine-tuning for hallucination reduction (Meta, CRAG). https://ai.meta.com/research/publications/ingest-and-ground-dispelling-hallucinations-from-continually-pretrained-llms-with-rag/
- Training small models to say "I don't know." https://arxiv.org/pdf/2410.09699
- Chain-of-verification, and its unreliability below about 13B. https://arxiv.org/pdf/2309.11495 and https://arxiv.org/html/2404.17140v2
- LLM plus CAS/formal tools for math correctness. https://arxiv.org/pdf/2505.20869
- ReadCtrl readability-controlled generation. https://arxiv.org/pdf/2406.09205
- IDK-token uncertainty modeling. https://arxiv.org/pdf/2412.06676

## Serving economics (Path B)

- SGLang vs vLLM benchmarks. https://particula.tech/blog/sglang-vs-vllm-inference-engine-comparison
- GPU cloud pricing comparison 2026. https://www.spheron.network/blog/gpu-cloud-pricing-comparison-2026/
- Quantized serving (FP8/AWQ) throughput and accuracy tradeoffs. https://vrlatech.com/llm-quantization-explained-int4-int8-fp8-awq-and-gptq-in-2026
- Prefix caching / RadixAttention. https://medium.com/@dharamendra1314.kumar/sglang-learning-series-part-1-shared-prefix-kv-cache-and-radixattention-d7a847d20b1f
- Gemma 3 27B vs peers comparisons. https://artificialanalysis.ai/models/comparisons/gemma-3-27b-vs-llama-3-3-instruct-70b

## Offline distribution and sync

- Kolibri (Learning Equality): peer sync, school server model. https://learningequality.org/kolibri/ and https://www.worldpossiblejustice.org/layer-2-rachel-servers/kolibri-syncing
- RACHEL / World Possible. https://www.raspberrypi.com/news/rachel-pi-delivering-education-worldwide/
- Internet-in-a-Box. https://internet-in-a-box.org/
- Ustad Mobile (offline-first LMS, AV1 compression). https://www.ustadmobile.com/lms/
- onebillion / onecourse (XPRIZE-validated offline tablet learning). https://onebillion.org/impact/
- Can't Wait to Learn (War Child). https://www.warchild.net/intervention-cwtl/
- Eneza (USSD/SMS learning). https://www.gsma.com/solutions-and-impact/connectivity-for-good/mobile-for-development/digital-grantees-portfolio/eneza-education/
- SQLite CRDT-style sync ecosystem. https://github.com/sqliteai/sqlite-sync
- Delta update tooling (casync/zchunk class). https://sbabic.github.io/swupdate/delta-update.html
- Zero-rating mechanics (UNESCO) and biNu/Moya datafree architecture. https://www.unesco.org/en/dtc-finance-toolkit-factsheets/zero-rating and https://medium.com/datafree/hot-startup-of-the-month-sas-datafree-platform-binu-1f7d7095f7a8
- Siyavula open CC-BY textbooks. https://www.siyavula.com/read
- xAPI for offline learning records. https://blog.commlabindia.com/elearning-design/xapi-blended-learning

## Zimbabwe context

- National AI Strategy 2026 to 2030, full text. https://veritaszim.net/sites/veritas_d/files/Zimbabwe%20National%20Artificial%20Intelligence%20Strategy.pdf
- Cabinet approval (Oct 2025) and launch (Mar 2026) coverage. https://techafricanews.com/2025/10/16/zimbabwe-approves-national-artificial-intelligence-strategy-for-2026-2030/ and https://eduzim.co.zw/news/2026/03/16/zimbabwe-launches-five-year-national-ai-strategy-rooted-in-ubuntu-philosophy-and-sovereign-data-principles/
- Strategy flagship detail (Pangolin, Nzwisiso.ai, Grand Challenge, Crucible, fund). https://www.africaainews.com/p/zimbabwe-national-ai-strategy
- AI for Impact Challenge 2026 (deadline 14 Jul 2026, USD 80,000 milestone support, Mutare bootcamp). https://iafrica.com/zimbabwe-opens-ai-for-impact-challenge-with-up-to-80000-in-funding/ and https://technomag.co.zw/zimbabwe-launches-2026-ai-for-impact-challenge-ai4i-to-drive-national-innovation/
- ZCHPC cluster specifications. https://zchpc.ac.zw/aboutus and https://www.top500.org/news/zimbabwe-to-deploy-300-teraflop-supercomputer-from-inspur/
- Cyber and Data Protection Act [Chapter 12:07], 2021. https://zimlii.org/akn/zw/act/2021/5/eng@2022-03-11
- Data-controller licensing (SI 155 of 2024). https://zimbabwe.misa.org/2025/03/14/navigating-the-data-protection-act-requirements-ensuring-compliance-for-zimbabwean-data-controllers/
- ZIMSEC syllabi (public). https://www5.zimsec.co.zw/syllabi/
- Heritage-Based Curriculum structure (compulsory subjects, CALA replacement). https://iharare.com/zimbabwe-replaces-cala-with-heritage-based-education-curriculum-what-students-need-to-know/
- Cambridge past-paper copyright policy. https://help.cambridgeinternational.org/hc/en-gb/articles/203544371
- Education crisis data (teacher exodus, pass-rate disparity, data costs). https://www.amnesty.org/en/latest/education/2024/05/zimbabwes-education-crisis-a-tale-of-debt-deficits-and-departing-teachers/
- Digital 2026 Zimbabwe (internet penetration, rural share, 4G coverage). https://datareportal.com/reports/digital-2026-zimbabwe
- Rural electrification gap. https://zimadvocate.com/2025/01/21/the-road-to-electrification-in-rural-zimbabwe-what-needs-to-be-done/
- Sub-Saharan data affordability (share of income per GB). https://www.ecofinagency.com/news/2407-47820-mobile-data-costs-still-too-high-in-sub-saharan-africa-says-world-bank
- Econet Zero precedent. https://innovation-village.com/econet-wireless-has-zero-rated-coursera-edx-org-and-more-in-zimbabwe/ [UNVERIFIED: current program status]
- Ruzivo Digital Learning (incumbent, online-first). https://www.higherlifefoundation.com/ruzivo-smart-learning-bringing-21st-century-learning-to-rural-zimbabwe/
- Zimbabwe languages and language-in-education policy. https://culturedwanderer.com/what-language-does-zimbabwe-speak/
