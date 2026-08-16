import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const universities = [
    { name: 'Harvard University', country: 'USA', city: 'Cambridge', ranking: 1, tuitionAnnualUsd: 56500, acceptanceRate: 4.0, applicationFee: 85, applicationDeadline: 'Jan 1', ieltsRequirement: 7.0, greRequirement: null, websiteUrl: 'https://www.harvard.edu', courses: ['Computer Science', 'Business', 'Law'] },
    { name: 'Massachusetts Institute of Technology', country: 'USA', city: 'Cambridge', ranking: 2, tuitionAnnualUsd: 57590, acceptanceRate: 4.5, applicationFee: 75, applicationDeadline: 'Jan 1', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.mit.edu', courses: ['Engineering', 'AI', 'Physics'] },
    { name: 'Stanford University', country: 'USA', city: 'Stanford', ranking: 3, tuitionAnnualUsd: 58416, acceptanceRate: 4.3, applicationFee: 90, applicationDeadline: 'Jan 5', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.stanford.edu', courses: ['Computer Science', 'Medicine', 'Economics'] },
    { name: 'University of California, Berkeley', country: 'USA', city: 'Berkeley', ranking: 12, tuitionAnnualUsd: 45162, acceptanceRate: 11.0, applicationFee: 125, applicationDeadline: 'Nov 30', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.berkeley.edu', courses: ['Data Science', 'Engineering', 'Economics'] },
    { name: 'University of California, Los Angeles', country: 'USA', city: 'Los Angeles', ranking: 15, tuitionAnnualUsd: 43330, acceptanceRate: 9.0, applicationFee: 125, applicationDeadline: 'Nov 30', ieltsRequirement: 6.5, greRequirement: 312, websiteUrl: 'https://www.ucla.edu', courses: ['Film', 'Engineering', 'Psychology'] },
    { name: 'Princeton University', country: 'USA', city: 'Princeton', ranking: 4, tuitionAnnualUsd: 56170, acceptanceRate: 5.8, applicationFee: 70, applicationDeadline: 'Jan 1', ieltsRequirement: 7.0, greRequirement: null, websiteUrl: 'https://www.princeton.edu', courses: ['Math', 'Public Policy', 'Physics'] },
    { name: 'Yale University', country: 'USA', city: 'New Haven', ranking: 5, tuitionAnnualUsd: 60500, acceptanceRate: 5.7, applicationFee: 80, applicationDeadline: 'Jan 2', ieltsRequirement: 7.0, greRequirement: null, websiteUrl: 'https://www.yale.edu', courses: ['Law', 'Medicine', 'History'] },
    { name: 'Columbia University', country: 'USA', city: 'New York', ranking: 6, tuitionAnnualUsd: 65100, acceptanceRate: 4.0, applicationFee: 85, applicationDeadline: 'Jan 5', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.columbia.edu', courses: ['Journalism', 'Engineering', 'International Affairs'] },
    { name: 'University of Chicago', country: 'USA', city: 'Chicago', ranking: 11, tuitionAnnualUsd: 64320, acceptanceRate: 6.2, applicationFee: 90, applicationDeadline: 'Jan 2', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.uchicago.edu', courses: ['Economics', 'Business', 'Physics'] },
    { name: 'Cornell University', country: 'USA', city: 'Ithaca', ranking: 13, tuitionAnnualUsd: 65200, acceptanceRate: 8.0, applicationFee: 80, applicationDeadline: 'Jan 2', ieltsRequirement: 7.0, greRequirement: 315, websiteUrl: 'https://www.cornell.edu', courses: ['Hotel Management', 'Engineering', 'Agriculture'] },
    { name: 'University of Pennsylvania', country: 'USA', city: 'Philadelphia', ranking: 10, tuitionAnnualUsd: 63960, acceptanceRate: 5.9, applicationFee: 80, applicationDeadline: 'Jan 5', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.upenn.edu', courses: ['Business', 'Nursing', 'Engineering'] },
    { name: 'Carnegie Mellon University', country: 'USA', city: 'Pittsburgh', ranking: 20, tuitionAnnualUsd: 61000, acceptanceRate: 11.0, applicationFee: 75, applicationDeadline: 'Dec 15', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.cmu.edu', courses: ['Computer Science', 'Robotics', 'Design'] },
    { name: 'Northwestern University', country: 'USA', city: 'Evanston', ranking: 17, tuitionAnnualUsd: 65000, acceptanceRate: 7.0, applicationFee: 75, applicationDeadline: 'Jan 1', ieltsRequirement: 7.0, greRequirement: 315, websiteUrl: 'https://www.northwestern.edu', courses: ['Journalism', 'Business', 'Engineering'] },
    { name: 'Duke University', country: 'USA', city: 'Durham', ranking: 25, tuitionAnnualUsd: 62700, acceptanceRate: 6.0, applicationFee: 85, applicationDeadline: 'Jan 2', ieltsRequirement: 7.0, greRequirement: 315, websiteUrl: 'https://www.duke.edu', courses: ['Medicine', 'Law', 'Engineering'] },
    { name: 'University of Toronto', country: 'Canada', city: 'Toronto', ranking: 18, tuitionAnnualUsd: 42000, acceptanceRate: 43.0, applicationFee: 180, applicationDeadline: 'Jan 15', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.utoronto.ca', courses: ['Computer Science', 'Medicine', 'Business'] },
    { name: 'McGill University', country: 'Canada', city: 'Montreal', ranking: 30, tuitionAnnualUsd: 30000, acceptanceRate: 46.0, applicationFee: 115, applicationDeadline: 'Feb 1', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.mcgill.ca', courses: ['Medicine', 'Law', 'Engineering'] },
    { name: 'University of British Columbia', country: 'Canada', city: 'Vancouver', ranking: 34, tuitionAnnualUsd: 38000, acceptanceRate: 53.0, applicationFee: 118, applicationDeadline: 'Jan 15', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.ubc.ca', courses: ['Computer Science', 'Forestry', 'Business'] },
    { name: 'University of Waterloo', country: 'Canada', city: 'Waterloo', ranking: 45, tuitionAnnualUsd: 34000, acceptanceRate: 53.0, applicationFee: 125, applicationDeadline: 'Feb 1', ieltsRequirement: 6.5, greRequirement: 308, websiteUrl: 'https://uwaterloo.ca', courses: ['Computer Science', 'Engineering', 'Mathematics'] },
    { name: 'University of Oxford', country: 'UK', city: 'Oxford', ranking: 2, tuitionAnnualUsd: 46500, acceptanceRate: 17.5, applicationFee: 75, applicationDeadline: 'Jan 15', ieltsRequirement: 7.5, greRequirement: 325, websiteUrl: 'https://www.ox.ac.uk', courses: ['Philosophy', 'Law', 'Medicine'] },
    { name: 'University of Cambridge', country: 'UK', city: 'Cambridge', ranking: 3, tuitionAnnualUsd: 47000, acceptanceRate: 21.0, applicationFee: 75, applicationDeadline: 'Jan 15', ieltsRequirement: 7.5, greRequirement: 325, websiteUrl: 'https://www.cam.ac.uk', courses: ['Mathematics', 'Engineering', 'Natural Sciences'] },
    { name: 'Imperial College London', country: 'UK', city: 'London', ranking: 6, tuitionAnnualUsd: 42000, acceptanceRate: 15.0, applicationFee: 80, applicationDeadline: 'Jan 6', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.imperial.ac.uk', courses: ['Engineering', 'Medicine', 'Data Science'] },
    { name: 'University College London', country: 'UK', city: 'London', ranking: 9, tuitionAnnualUsd: 32000, acceptanceRate: 30.0, applicationFee: 90, applicationDeadline: 'Jan 26', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.ucl.ac.uk', courses: ['Architecture', 'Law', 'Computer Science'] },
    { name: 'London School of Economics', country: 'UK', city: 'London', ranking: 45, tuitionAnnualUsd: 28000, acceptanceRate: 12.0, applicationFee: 80, applicationDeadline: 'Jan 15', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.lse.ac.uk', courses: ['Economics', 'Politics', 'Finance'] },
    { name: 'University of Edinburgh', country: 'UK', city: 'Edinburgh', ranking: 22, tuitionAnnualUsd: 31000, acceptanceRate: 46.0, applicationFee: 50, applicationDeadline: 'Jan 31', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.ed.ac.uk', courses: ['Informatics', 'Medicine', 'History'] },
    { name: 'University of Manchester', country: 'UK', city: 'Manchester', ranking: 32, tuitionAnnualUsd: 29000, acceptanceRate: 56.0, applicationFee: 60, applicationDeadline: 'Jan 29', ieltsRequirement: 6.5, greRequirement: 308, websiteUrl: 'https://www.manchester.ac.uk', courses: ['Business', 'Engineering', 'Biology'] },
    { name: 'King’s College London', country: 'UK', city: 'London', ranking: 38, tuitionAnnualUsd: 30000, acceptanceRate: 13.0, applicationFee: 80, applicationDeadline: 'Jan 15', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.kcl.ac.uk', courses: ['Nursing', 'Law', 'Medicine'] },
    { name: 'University of Bristol', country: 'UK', city: 'Bristol', ranking: 55, tuitionAnnualUsd: 26500, acceptanceRate: 67.0, applicationFee: 30, applicationDeadline: 'Jan 25', ieltsRequirement: 6.5, greRequirement: 305, websiteUrl: 'https://www.bristol.ac.uk', courses: ['Engineering', 'Physics', 'Economics'] },
    { name: 'ETH Zurich', country: 'Switzerland', city: 'Zurich', ranking: 7, tuitionAnnualUsd: 1800, acceptanceRate: 27.0, applicationFee: 150, applicationDeadline: 'Apr 30', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://ethz.ch', courses: ['Engineering', 'Computer Science', 'Architecture'] },
    { name: 'EPFL', country: 'Switzerland', city: 'Lausanne', ranking: 10, tuitionAnnualUsd: 1900, acceptanceRate: 29.0, applicationFee: 150, applicationDeadline: 'Apr 15', ieltsRequirement: 7.0, greRequirement: 320, websiteUrl: 'https://www.epfl.ch', courses: ['Computer Science', 'Engineering', 'Life Sciences'] },
    { name: 'Technical University of Munich', country: 'Germany', city: 'Munich', ranking: 30, tuitionAnnualUsd: 0, acceptanceRate: 8.0, applicationFee: 75, applicationDeadline: 'Jul 15', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.tum.de', courses: ['Engineering', 'Robotics', 'Medicine'] },
    { name: 'RWTH Aachen University', country: 'Germany', city: 'Aachen', ranking: 99, tuitionAnnualUsd: 0, acceptanceRate: 10.0, applicationFee: 50, applicationDeadline: 'Jul 15', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.rwth-aachen.de', courses: ['Mechanical Engineering', 'Computer Science', 'Physics'] },
    { name: 'University of Amsterdam', country: 'Netherlands', city: 'Amsterdam', ranking: 58, tuitionAnnualUsd: 15000, acceptanceRate: 20.0, applicationFee: 100, applicationDeadline: 'Apr 1', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.uva.nl', courses: ['Psychology', 'Economics', 'Communication'] },
    { name: 'Delft University of Technology', country: 'Netherlands', city: 'Delft', ranking: 47, tuitionAnnualUsd: 17000, acceptanceRate: 25.0, applicationFee: 100, applicationDeadline: 'Apr 1', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.tudelft.nl', courses: ['Aerospace Engineering', 'Architecture', 'Computer Science'] },
    { name: 'KU Leuven', country: 'Belgium', city: 'Leuven', ranking: 76, tuitionAnnualUsd: 4500, acceptanceRate: 29.0, applicationFee: 90, applicationDeadline: 'Mar 1', ieltsRequirement: 6.5, greRequirement: 308, websiteUrl: 'https://www.kuleuven.be', courses: ['Engineering', 'Medicine', 'Law'] },
    { name: 'Sorbonne University', country: 'France', city: 'Paris', ranking: 63, tuitionAnnualUsd: 4500, acceptanceRate: 18.0, applicationFee: 120, applicationDeadline: 'Mar 31', ieltsRequirement: 6.5, greRequirement: 308, websiteUrl: 'https://www.sorbonne-universite.fr', courses: ['Mathematics', 'Physics', 'History'] },
    { name: 'Trinity College Dublin', country: 'Ireland', city: 'Dublin', ranking: 81, tuitionAnnualUsd: 22000, acceptanceRate: 35.0, applicationFee: 55, applicationDeadline: 'Jun 30', ieltsRequirement: 6.5, greRequirement: 305, websiteUrl: 'https://www.tcd.ie', courses: ['Computer Science', 'Medicine', 'Literature'] },
    { name: 'University of Copenhagen', country: 'Denmark', city: 'Copenhagen', ranking: 107, tuitionAnnualUsd: 15000, acceptanceRate: 40.0, applicationFee: 100, applicationDeadline: 'Mar 15', ieltsRequirement: 6.5, greRequirement: 305, websiteUrl: 'https://www.ku.dk', courses: ['Biology', 'Pharmacy', 'Social Sciences'] },
    { name: 'National University of Singapore', country: 'Singapore', city: 'Singapore', ranking: 8, tuitionAnnualUsd: 37500, acceptanceRate: 5.0, applicationFee: 20, applicationDeadline: 'Mar 15', ieltsRequirement: 6.5, greRequirement: 320, websiteUrl: 'https://www.nus.edu.sg', courses: ['Computer Science', 'Business', 'Engineering'] },
    { name: 'Nanyang Technological University', country: 'Singapore', city: 'Singapore', ranking: 15, tuitionAnnualUsd: 36000, acceptanceRate: 5.0, applicationFee: 20, applicationDeadline: 'Mar 31', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.ntu.edu.sg', courses: ['Engineering', 'Materials Science', 'AI'] },
    { name: 'University of Tokyo', country: 'Japan', city: 'Tokyo', ranking: 28, tuitionAnnualUsd: 5350, acceptanceRate: 34.0, applicationFee: 300, applicationDeadline: 'Dec 1', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.u-tokyo.ac.jp', courses: ['Engineering', 'Law', 'Medicine'] },
    { name: 'Kyoto University', country: 'Japan', city: 'Kyoto', ranking: 46, tuitionAnnualUsd: 5350, acceptanceRate: 36.0, applicationFee: 300, applicationDeadline: 'Dec 1', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.kyoto-u.ac.jp', courses: ['Science', 'Engineering', 'Agriculture'] },
    { name: 'Tsinghua University', country: 'China', city: 'Beijing', ranking: 25, tuitionAnnualUsd: 8000, acceptanceRate: 3.0, applicationFee: 600, applicationDeadline: 'Mar 1', ieltsRequirement: 6.5, greRequirement: 320, websiteUrl: 'https://www.tsinghua.edu.cn', courses: ['Engineering', 'Architecture', 'Computer Science'] },
    { name: 'Peking University', country: 'China', city: 'Beijing', ranking: 17, tuitionAnnualUsd: 7800, acceptanceRate: 3.0, applicationFee: 600, applicationDeadline: 'Mar 1', ieltsRequirement: 6.5, greRequirement: 320, websiteUrl: 'https://english.pku.edu.cn', courses: ['Law', 'Medicine', 'Economics'] },
    { name: 'The University of Hong Kong', country: 'Hong Kong', city: 'Hong Kong', ranking: 26, tuitionAnnualUsd: 20000, acceptanceRate: 10.0, applicationFee: 450, applicationDeadline: 'Mar 31', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.hku.hk', courses: ['Law', 'Medicine', 'Business'] },
    { name: 'Hong Kong University of Science and Technology', country: 'Hong Kong', city: 'Hong Kong', ranking: 60, tuitionAnnualUsd: 18000, acceptanceRate: 15.0, applicationFee: 450, applicationDeadline: 'Mar 31', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://www.hkust.edu.hk', courses: ['Engineering', 'Business', 'Computer Science'] },
    { name: 'Seoul National University', country: 'South Korea', city: 'Seoul', ranking: 36, tuitionAnnualUsd: 6000, acceptanceRate: 15.0, applicationFee: 80, applicationDeadline: 'Feb 28', ieltsRequirement: 6.5, greRequirement: 315, websiteUrl: 'https://en.snu.ac.kr', courses: ['Engineering', 'Medicine', 'Business'] },
    { name: 'KAIST', country: 'South Korea', city: 'Daejeon', ranking: 56, tuitionAnnualUsd: 5500, acceptanceRate: 15.0, applicationFee: 80, applicationDeadline: 'Mar 15', ieltsRequirement: 6.5, greRequirement: 318, websiteUrl: 'https://www.kaist.ac.kr', courses: ['Engineering', 'AI', 'Physics'] },
    { name: 'The University of Melbourne', country: 'Australia', city: 'Melbourne', ranking: 14, tuitionAnnualUsd: 35000, acceptanceRate: 70.0, applicationFee: 100, applicationDeadline: 'Nov 30', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.unimelb.edu.au', courses: ['Medicine', 'Law', 'Business'] },
    { name: 'Australian National University', country: 'Australia', city: 'Canberra', ranking: 30, tuitionAnnualUsd: 33000, acceptanceRate: 35.0, applicationFee: 110, applicationDeadline: 'Dec 31', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.anu.edu.au', courses: ['International Relations', 'Science', 'Economics'] },
    { name: 'The University of Sydney', country: 'Australia', city: 'Sydney', ranking: 19, tuitionAnnualUsd: 37000, acceptanceRate: 30.0, applicationFee: 100, applicationDeadline: 'Jan 31', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.sydney.edu.au', courses: ['Medicine', 'Engineering', 'Arts'] },
    { name: 'University of New South Wales', country: 'Australia', city: 'Sydney', ranking: 19, tuitionAnnualUsd: 36000, acceptanceRate: 31.0, applicationFee: 125, applicationDeadline: 'Feb 1', ieltsRequirement: 6.5, greRequirement: 310, websiteUrl: 'https://www.unsw.edu.au', courses: ['Engineering', 'Business', 'Computer Science'] },
    { name: 'Monash University', country: 'Australia', city: 'Melbourne', ranking: 37, tuitionAnnualUsd: 34000, acceptanceRate: 40.0, applicationFee: 100, applicationDeadline: 'Feb 28', ieltsRequirement: 6.5, greRequirement: 308, websiteUrl: 'https://www.monash.edu', courses: ['Pharmacy', 'Medicine', 'Engineering'] },
];

const scholarships = [
    { name: 'Chevening Scholarship', country: 'UK', amountUsd: 50000, fundingLevel: 'Full', eligibility: 'International students with leadership potential', deadline: 'Nov 5', websiteUrl: 'https://www.chevening.org' },
    { name: 'Fulbright Foreign Student Program', country: 'USA', amountUsd: 40000, fundingLevel: 'Full', eligibility: 'Graduate study in the United States', deadline: 'Oct 10', websiteUrl: 'https://foreign.fulbrightonline.org' },
    { name: 'DAAD Scholarship', country: 'Germany', amountUsd: 25000, fundingLevel: 'Partial', eligibility: 'International students for German universities', deadline: 'Varies', websiteUrl: 'https://www.daad.de' },
    { name: 'Erasmus Mundus Joint Masters', country: 'Europe', amountUsd: 30000, fundingLevel: 'Full', eligibility: 'International master’s applicants', deadline: 'Jan 15', websiteUrl: 'https://erasmus-plus.ec.europa.eu' },
    { name: 'MEXT Scholarship', country: 'Japan', amountUsd: 28000, fundingLevel: 'Full', eligibility: 'Students selected through Japanese embassy or university route', deadline: 'May 31', websiteUrl: 'https://www.studyinjapan.go.jp' },
    { name: 'GKS Scholarship', country: 'South Korea', amountUsd: 30000, fundingLevel: 'Full', eligibility: 'International students applying to Korean institutions', deadline: 'Varies', websiteUrl: 'https://www.studyinkorea.go.kr' },
    { name: 'Australia Awards', country: 'Australia', amountUsd: 45000, fundingLevel: 'Full', eligibility: 'Students from eligible developing countries', deadline: 'Apr 30', websiteUrl: 'https://www.australiaawards.gov.au' },
    { name: 'GREAT Scholarship', country: 'UK', amountUsd: 15000, fundingLevel: 'Partial', eligibility: 'Students from selected countries', deadline: 'Varies', websiteUrl: 'https://study-uk.britishcouncil.org' },
    { name: 'Vanier Canada Graduate Scholarships', country: 'Canada', amountUsd: 40000, fundingLevel: 'Full', eligibility: 'Doctoral students in Canada', deadline: 'Nov 1', websiteUrl: 'https://vanier.gc.ca' },
    { name: 'Swiss Government Excellence Scholarship', country: 'Switzerland', amountUsd: 30000, fundingLevel: 'Full', eligibility: 'Postgraduate researchers and artists', deadline: 'Sep 30', websiteUrl: 'https://www.sbfi.admin.ch' },
    { name: 'Joint Japan/World Bank Scholarship', country: 'Global', amountUsd: 35000, fundingLevel: 'Full', eligibility: 'Students from developing countries', deadline: 'Varies', websiteUrl: 'https://www.worldbank.org' },
    { name: 'ADB-Japan Scholarship Program', country: 'Asia', amountUsd: 30000, fundingLevel: 'Full', eligibility: 'Applicants from ADB developing member countries', deadline: 'Varies', websiteUrl: 'https://www.adb.org' },
];

async function main() {
    await prisma.scholarship.deleteMany();
    await prisma.university.deleteMany();

    await Promise.all(
        universities.map((university) =>
            prisma.university.create({
                data: {
                    ...university,
                    courses: university.courses,
                    lastScraped: new Date(),
                },
            })
        )
    );

    await Promise.all(
        scholarships.map((scholarship) =>
            prisma.scholarship.create({
                data: {
                    ...scholarship,
                    lastScraped: new Date(),
                },
            })
        )
    );

    console.log(`Seeded ${universities.length} universities and ${scholarships.length} scholarships.`);
}

main()
    .catch((error) => {
        console.error('Seed error:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });