/* eslint-env node */
require('dotenv').config();
const Airtable = require('airtable');
const slugify = require('@sindresorhus/slugify');

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY,
});

const base = Airtable.base(process.env.AIRTABLE_BASE_ID);
const viewDrafts = process.env.VIEW_DRAFTS === 'true';

const getQuestions = async () => {
  const questions = await base('Questions and Answers').select().all();

  const publishedQuestions = questions
    .filter((record) => record.fields.Published || viewDrafts)
    .map((record) => record.fields);

  return publishedQuestions;
};

const getFlashCardQuestions = (questions) =>
  questions.filter((question) => !question['Multiple Choice Only']);

const getUniqueCategories = (questions) => {
  return [
    ...new Set(
      questions
        .map((question) => question.Tags)
        .flat()
        .sort()
    ),
  ];
};

const groupQuestionsIntoCategories = (questions, categories) => {
  const questionGroups = [];

  categories.forEach((category) => {
    let pageNumber = 1;
    const questionTotal = questions.reduce((sum, question) => {
      if (question.Tags.includes(category)) {
        return sum + 1;
      }

      return sum;
    }, 0);

    questions.forEach((question) => {
      if (question.Tags.includes(category)) {
        questionGroups.push({
          tagName: slugify(category),
          pageNumber,
          questionTotal,
          question,
        });

        pageNumber += 1;
      }
    });
  });

  return questionGroups;
};

module.exports = async () => {
  const questions = await getQuestions();
  const categories = getUniqueCategories(questions);
  const questionGroups = groupQuestionsIntoCategories(questions, categories);

  const flashCardQuestions = getFlashCardQuestions(questions);
  const flashCardCategories = getUniqueCategories(flashCardQuestions);
  const flashCardQuestionGroups = groupQuestionsIntoCategories(
    flashCardQuestions,
    flashCardCategories
  );

  return {
    questions,
    categories,
    questionGroups,
    flashCardQuestions,
    flashCardCategories,
    flashCardQuestionGroups,
  };
};
