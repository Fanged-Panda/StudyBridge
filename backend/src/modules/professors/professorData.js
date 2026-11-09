/**
 * Faculty directory seed data.
 *
 * Names are illustrative examples used to populate the demo directory; each
 * entry is paired with a real university already present in the database and a
 * realistic department / research field so students can explore who works on
 * what. Research fields are the searchable signal on the Professors page.
 */
export const PROFESSORS = [
  // Harvard University
  { university: 'Harvard University', name: 'Dr. Elena Marsh', title: 'Professor', department: 'Computer Science', field: 'Machine Learning, Fairness in AI', bio: 'Studies how recommendation systems shape what students and voters see, and builds auditing tools for them.' },
  { university: 'Harvard University', name: 'Dr. Samuel Okafor', title: 'Associate Professor', department: 'Economics', field: 'Development Economics, Education Policy', bio: 'Evaluates scholarship and cash-transfer programmes in West Africa with large-scale field experiments.' },
  { university: 'Harvard University', name: 'Dr. Priya Raghavan', title: 'Assistant Professor', department: 'Public Health', field: 'Epidemiology, Global Health', bio: 'Models infectious-disease spread in dense urban areas and advises municipal health departments.' },

  // MIT
  { university: 'Massachusetts Institute of Technology', name: 'Dr. Jonah Feld', title: 'Professor', department: 'Electrical Engineering and Computer Science', field: 'Computer Vision, Robotics', bio: 'Builds perception stacks for warehouse robots that must work without a network connection.' },
  { university: 'Massachusetts Institute of Technology', name: 'Dr. Naomi Saito', title: 'Associate Professor', department: 'Mechanical Engineering', field: 'Thermal Systems, Renewable Energy', bio: 'Designs low-cost solar-thermal storage for off-grid clinics and schools.' },
  { university: 'Massachusetts Institute of Technology', name: 'Dr. Luis Ferreira', title: 'Assistant Professor', department: 'Media Arts and Sciences', field: 'Human-Computer Interaction, Accessibility', bio: 'Prototypes tactile interfaces so blind students can read complex charts and equations.' },

  // Oxford
  { university: 'University of Oxford', name: 'Dr. Harriet Cole', title: 'Professor', department: 'Computer Science', field: 'Natural Language Processing, Computational Linguistics', bio: 'Works on multilingual language models and how they fail on low-resource languages.' },
  { university: 'University of Oxford', name: 'Dr. Idris Bello', title: 'Associate Professor', department: 'Politics and International Relations', field: 'Comparative Politics, Migration', bio: 'Studies how visa regimes reshape the choices of international students and skilled workers.' },
  { university: 'University of Oxford', name: 'Dr. Marta Kowalska', title: 'Assistant Professor', department: 'Materials Science', field: 'Battery Materials, Electrochemistry', bio: 'Synthesises sodium-ion cathodes that avoid scarce lithium and cobalt.' },

  // Stanford
  { university: 'Stanford University', name: 'Dr. Aaron Reeves', title: 'Professor', department: 'Computer Science', field: 'Reinforcement Learning, Decision Making', bio: 'Researches agents that learn safely from limited feedback in clinical settings.' },
  { university: 'Stanford University', name: 'Dr. Yuki Tanaka', title: 'Associate Professor', department: 'Bioengineering', field: 'Computational Biology, Genomics', bio: 'Develops single-cell analysis methods for early cancer detection.' },
  { university: 'Stanford University', name: 'Dr. Grace Whitfield', title: 'Professor', department: 'Graduate School of Education', field: 'Learning Sciences, Assessment', bio: 'Studies how feedback timing changes what students retain in online courses.' },

  // Cambridge
  { university: 'University of Cambridge', name: 'Dr. Oliver Grant', title: 'Professor', department: 'Engineering', field: 'Control Systems, Autonomous Vehicles', bio: 'Works on verification methods that keep autonomous systems inside safe operating limits.' },
  { university: 'University of Cambridge', name: 'Dr. Aisha Rahman', title: 'Assistant Professor', department: 'Clinical Neurosciences', field: 'Cognitive Neuroscience, Sleep', bio: 'Investigates how sleep timing affects memory consolidation in adolescents.' },

  // Princeton
  { university: 'Princeton University', name: 'Dr. Henry Vasquez', title: 'Professor', department: 'Computer Science', field: 'Theoretical Computer Science, Cryptography', bio: 'Proves security guarantees for protocols used in privacy-preserving data sharing.' },
  { university: 'Princeton University', name: 'Dr. Meera Deshpande', title: 'Associate Professor', department: 'Astrophysics', field: 'Exoplanets, Observational Astronomy', bio: 'Characterises atmospheres of small planets with ground- and space-based telescopes.' },

  // Yale
  { university: 'Yale University', name: 'Dr. Katherine Boyle', title: 'Professor', department: 'Law', field: 'International Law, Human Rights', bio: 'Advises refugee legal-aid clinics on asylum claims involving digital evidence.' },
  { university: 'Yale University', name: 'Dr. Tobias Lang', title: 'Assistant Professor', department: 'Molecular Biophysics', field: 'Structural Biology, Drug Design', bio: 'Uses cryo-electron microscopy to find new binding sites on antibiotic-resistant enzymes.' },

  // Columbia
  { university: 'Columbia University', name: 'Dr. Renee Alvarado', title: 'Associate Professor', department: 'Computer Science', field: 'Data Systems, Databases', bio: 'Builds query engines that stay fast on cheap commodity hardware.' },
  { university: 'Columbia University', name: 'Dr. Nikhil Sharma', title: 'Professor', department: 'Earth and Environmental Sciences', field: 'Climate Science, Hydrology', bio: 'Models monsoon variability and its effect on irrigation across South Asia.' },

  // Imperial College London
  { university: 'Imperial College London', name: 'Dr. Freya Lindqvist', title: 'Professor', department: 'Computing', field: 'Cybersecurity, Applied Cryptography', bio: 'Studies secure messaging at scale and the usability of end-to-end encryption.' },
  { university: 'Imperial College London', name: 'Dr. Kwame Mensah', title: 'Associate Professor', department: 'Civil and Environmental Engineering', field: 'Water Engineering, Urban Infrastructure', bio: 'Designs low-energy treatment plants for fast-growing secondary cities.' },

  // ETH Zurich
  { university: 'ETH Zurich', name: 'Dr. Jonas Weber', title: 'Professor', department: 'Computer Science', field: 'Robotics, Legged Locomotion', bio: 'Teaches quadruped robots to walk over terrain they have never seen.' },
  { university: 'ETH Zurich', name: 'Dr. Camille Rochat', title: 'Assistant Professor', department: 'Environmental Systems Science', field: 'Carbon Accounting, Climate Policy', bio: 'Quantifies the real-world emissions savings of building retrofits.' },

  // NUS
  { university: 'National University of Singapore', name: 'Dr. Wei Ling Tan', title: 'Professor', department: 'Computer Science', field: 'Computer Graphics, Rendering', bio: 'Develops real-time rendering techniques for mobile GPUs.' },
  { university: 'National University of Singapore', name: 'Dr. Arjun Nair', title: 'Associate Professor', department: 'Biomedical Engineering', field: 'Medical Imaging, Wearables', bio: 'Builds low-cost ultrasound probes and the signal processing behind them.' },

  // UCL
  { university: 'University College London', name: 'Dr. Sophie Adeyemi', title: 'Professor', department: 'Computer Science', field: 'Human-Computer Interaction, Digital Health', bio: 'Co-designs mental-health apps with young people and measures what actually helps.' },
  { university: 'University College London', name: 'Dr. Peter Novak', title: 'Associate Professor', department: 'Bartlett School of Architecture', field: 'Urban Design, Sustainable Cities', bio: 'Studies street-level heat and shade in rapidly densifying neighbourhoods.' },

  // UPenn
  { university: 'University of Pennsylvania', name: 'Dr. Lauren Meyer', title: 'Professor', department: 'Wharton School', field: 'Finance, Fintech', bio: 'Analyses how mobile money changes household saving behaviour.' },
  { university: 'University of Pennsylvania', name: 'Dr. Diego Hidalgo', title: 'Assistant Professor', department: 'Computer and Information Science', field: 'Programming Languages, Compilers', bio: 'Works on compilers that make data-parallel code portable across accelerators.' },

  // EPFL
  { university: 'EPFL', name: 'Dr. Aline Girard', title: 'Professor', department: 'Computer and Communication Sciences', field: 'Machine Learning, Graph Neural Networks', bio: 'Applies graph learning to molecular property prediction.' },
  { university: 'EPFL', name: 'Dr. Mateo Rossi', title: 'Assistant Professor', department: 'Microengineering', field: 'Photonics, Sensors', bio: 'Builds chip-scale optical sensors for environmental monitoring.' },

  // University of Chicago
  { university: 'University of Chicago', name: 'Dr. Rachel Stein', title: 'Professor', department: 'Economics', field: 'Behavioural Economics, Labour Markets', bio: 'Runs field experiments on how job seekers respond to credential signals.' },
  { university: 'University of Chicago', name: 'Dr. Omar Haddad', title: 'Associate Professor', department: 'Molecular Engineering', field: 'Quantum Materials, Nanoscience', bio: 'Grows thin-film superconductors for low-power computing.' },

  // Berkeley
  { university: 'University of California, Berkeley', name: 'Dr. Emily Chen', title: 'Professor', department: 'Electrical Engineering and Computer Sciences', field: 'Machine Learning Systems, Efficiency', bio: 'Cuts the energy cost of training large models without losing accuracy.' },
  { university: 'University of California, Berkeley', name: 'Dr. Malik Johnson', title: 'Assistant Professor', department: 'Sociology', field: 'Higher Education, Inequality', bio: 'Tracks how first-generation students navigate admissions and financial aid.' },

  // Cornell
  { university: 'Cornell University', name: 'Dr. Hannah Lindgren', title: 'Associate Professor', department: 'Computer Science', field: 'Distributed Systems, Cloud Computing', bio: 'Designs storage systems that tolerate region-wide failures.' },
  { university: 'Cornell University', name: 'Dr. Victor Alvarez', title: 'Professor', department: 'Plant Sciences', field: 'Plant Genetics, Food Security', bio: 'Breeds drought-tolerant cereals with genomics-assisted selection.' },

  // Melbourne
  { university: 'The University of Melbourne', name: 'Dr. Charlotte Dean', title: 'Professor', department: 'Computing and Information Systems', field: 'Information Retrieval, Search', bio: 'Improves search for conversational assistants in low-bandwidth settings.' },
  { university: 'The University of Melbourne', name: 'Dr. Ravi Subramanian', title: 'Associate Professor', department: 'Medicine', field: 'Public Health, Health Economics', bio: 'Costs out screening programmes for rural clinics.' },

  // UCLA
  { university: 'University of California, Los Angeles', name: 'Dr. Natalie Brooks', title: 'Professor', department: 'Computer Science', field: 'Computer Vision, Medical Imaging', bio: 'Builds lesion-detection models that are robust to different scanner hardware.' },
  { university: 'University of California, Los Angeles', name: 'Dr. Kenji Morita', title: 'Assistant Professor', department: 'Materials Science and Engineering', field: 'Soft Robotics, Polymer Science', bio: 'Creates stretchable sensors for wearable rehabilitation devices.' },

  // NTU Singapore
  { university: 'Nanyang Technological University', name: 'Dr. Hui Min Lim', title: 'Associate Professor', department: 'Electrical and Electronic Engineering', field: 'Wireless Communications, 6G', bio: 'Studies reconfigurable surfaces that extend coverage in dense cities.' },

  // Peking
  { university: 'Peking University', name: 'Dr. Jian Wu', title: 'Professor', department: 'Computer Science', field: 'Natural Language Processing, Multimodal AI', bio: 'Works on Chinese-language multimodal benchmarks and evaluation.' },
  { university: 'Peking University', name: 'Dr. Xiaoyu Zhao', title: 'Associate Professor', department: 'School of Life Sciences', field: 'Cell Biology, Cancer Research', bio: 'Maps tumour microenvironments at single-cell resolution.' },

  // Toronto
  { university: 'University of Toronto', name: 'Dr. Sarah Whitmore', title: 'Professor', department: 'Computer Science', field: 'Deep Learning, Generative Models', bio: 'Studies controllable generation and the evaluation of synthetic data.' },
  { university: 'University of Toronto', name: 'Dr. Adeel Qureshi', title: 'Assistant Professor', department: 'Mechanical and Industrial Engineering', field: 'Additive Manufacturing, Materials', bio: 'Prints metal lattice parts for lightweight aerospace brackets.' },

  // CMU
  { university: 'Carnegie Mellon University', name: 'Dr. Brian Feldman', title: 'Professor', department: 'Robotics Institute', field: 'Autonomous Driving, Perception', bio: 'Tests perception systems against rare and adversarial road scenarios.' },
  { university: 'Carnegie Mellon University', name: 'Dr. Sonia Kapoor', title: 'Associate Professor', department: 'Software and Societal Systems', field: 'Software Engineering, Program Analysis', bio: 'Finds latent bugs in large codebases with learned static analysis.' },

  // Edinburgh
  { university: 'University of Edinburgh', name: 'Dr. Fiona MacLeod', title: 'Professor', department: 'Informatics', field: 'Speech Processing, Speech Synthesis', bio: 'Builds speech tools for minority languages with very little recorded audio.' },

  // Tsinghua
  { university: 'Tsinghua University', name: 'Dr. Lei Zhang', title: 'Professor', department: 'Automation', field: 'Control Theory, Smart Grids', bio: 'Stabilises distribution grids that host large amounts of rooftop solar.' },

  // Duke
  { university: 'Duke University', name: 'Dr. Marcus Bell', title: 'Associate Professor', department: 'Biostatistics and Bioinformatics', field: 'Biostatistics, Clinical Trials', bio: 'Designs adaptive trials that stop early when a treatment clearly works.' },

  // University of Tokyo
  { university: 'University of Tokyo', name: 'Dr. Aiko Nakamura', title: 'Professor', department: 'Information Science and Technology', field: 'Robotics, Human-Robot Interaction', bio: 'Studies how social robots earn trust in eldercare settings.' },

  // Technical University of Munich
  { university: 'Technical University of Munich', name: 'Dr. Lukas Hoffmann', title: 'Associate Professor', department: 'Informatics', field: 'Computer Vision, Autonomous Systems', bio: 'Combines LiDAR and camera data for safe urban navigation.' },

  // McGill
  { university: 'McGill University', name: 'Dr. Amelie Tremblay', title: 'Professor', department: 'Computer Science', field: 'Machine Learning, Healthcare AI', bio: 'Develops privacy-preserving models trained across hospital networks.' },

  // Manchester
  { university: 'University of Manchester', name: 'Dr. Ian Whitaker', title: 'Professor', department: 'Materials', field: 'Graphene, 2D Materials', bio: 'Scales graphene membranes for water filtration.' },

  // UBC
  { university: 'University of British Columbia', name: 'Dr. Sophie Trembley', title: 'Associate Professor', department: 'Forestry', field: 'Ecology, Wildfire Science', bio: 'Models how fuel treatments change wildfire behaviour near towns.' },

  // Seoul National University
  { university: 'Seoul National University', name: 'Dr. Ji-hoon Park', title: 'Professor', department: 'Electrical and Computer Engineering', field: 'Semiconductor Devices, Memory', bio: 'Explores next-generation memory cells for edge devices.' },

  // KCL
  { university: "King’s College London", name: 'Dr. Beatrice Osei', title: 'Associate Professor', department: 'Digital Humanities', field: 'Digital Humanities, Text Mining', bio: 'Mines historical archives to reconstruct student migration patterns.' },

  // LSE
  { university: 'London School of Economics', name: 'Dr. Finn Gallagher', title: 'Professor', department: 'Economics', field: 'Public Economics, Inequality', bio: 'Studies how tuition funding models change who enrols in postgraduate study.' },

  // Waterloo
  { university: 'University of Waterloo', name: 'Dr. Allison Reid', title: 'Associate Professor', department: 'Computer Science', field: 'Algorithms, Graph Theory', bio: 'Designs faster routing algorithms for transport and logistics networks.' },

  // Kyoto
  { university: 'Kyoto University', name: 'Dr. Haruto Sato', title: 'Professor', department: 'Informatics', field: 'Formal Methods, Verification', bio: 'Proves correctness of control software for medical devices.' },

  // Delft
  { university: 'Delft University of Technology', name: 'Dr. Sanne de Vries', title: 'Associate Professor', department: 'Aerospace Engineering', field: 'Aerodynamics, Wind Energy', bio: 'Optimises wind-farm layouts to reduce wake losses.' },

  // KAIST
  { university: 'KAIST', name: 'Dr. Min-seo Cho', title: 'Assistant Professor', department: 'Bio and Brain Engineering', field: 'Neuroengineering, Brain-Computer Interfaces', bio: 'Improves decoding of intended movement from non-invasive signals.' },

  // Amsterdam
  { university: 'University of Amsterdam', name: 'Dr. Lars van Dijk', title: 'Professor', department: 'Informatics Institute', field: 'Data Science, Causal Inference', bio: 'Estimates causal effects from messy observational data in education.' },

  // Trinity College Dublin
  { university: 'Trinity College Dublin', name: 'Dr. Niamh O’Connor', title: 'Associate Professor', department: 'Computer Science', field: 'Networks, Edge Computing', bio: 'Puts machine-learning inference on cheap edge hardware for farms.' },
];
