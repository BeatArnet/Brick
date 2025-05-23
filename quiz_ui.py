def get_user_answer(question_data):
    """
    Displays a single quiz question and prompts the user for an answer.

    Args:
        question_data (dict): A dictionary containing the question, title, answers.
                              Example: {'title': '...', 'question': '...', 
                                        'answers': ['A', 'B', 'C'], ...}

    Returns:
        int: The 0-indexed integer of the user's chosen answer.
    """
    print(f"\n--- {question_data['title']} ---")
    print(f"\n{question_data['question']}")

    answer_labels = ['A', 'B', 'C']
    for i, answer in enumerate(question_data['answers']):
        # Ensure there are enough labels for the answers
        if i < len(answer_labels):
            print(f"{answer_labels[i]}. {answer}")
        else:
            print(f"?. {answer}") # Fallback if more than 3 answers

    while True:
        prompt_labels = answer_labels[:len(question_data['answers'])]
        user_input = input(f"\nEnter your answer ({', '.join(prompt_labels)}): ").upper()
        if user_input in prompt_labels:
            return prompt_labels.index(user_input)
        else:
            print(f"Invalid input. Please enter one of {', '.join(prompt_labels)}.")

def run_quiz_question(question_data):
    """
    Runs a single quiz question, gets user input, provides feedback, and waits for confirmation.

    Args:
        question_data (dict): A dictionary containing the question, title, answers,
                              and correct answer index.

    Returns:
        bool: True if the user's answer was correct, False otherwise.
    """
    user_answer_index = get_user_answer(question_data)
    
    correct_answer_index = question_data['correct_answer_index']
    is_correct = (user_answer_index == correct_answer_index)

    user_choice_text = question_data['answers'][user_answer_index]
    correct_choice_text = question_data['answers'][correct_answer_index]
    
    answer_labels = ['A', 'B', 'C'] # Used for displaying the correct answer label if needed

    print("\n--- Feedback ---")
    if is_correct:
        print(f"Your answer: {user_choice_text} (Correct!)")
        # Simulate pale green background for user's choice (console approximation)
        print(f"[{user_choice_text}] <--- Your choice (Correct)")
    else:
        print(f"Your answer: {user_choice_text} (Incorrect)")
        # Simulate pale red background for user's choice (console approximation)
        print(f"[{user_choice_text}] <--- Your choice (Incorrect)")
        print(f"Correct answer: {correct_choice_text}")
        # Simulate pale green background for correct choice (console approximation)
        print(f"[{correct_choice_text}] <--- Correct answer")

    input("\nPress Enter to continue...")
    return is_correct

if __name__ == '__main__':
    try:
        from quiz_data import get_quiz_data

        questions = get_quiz_data()
        if questions:
            print("Quiz data loaded successfully for testing run_quiz_question.")
            # Test with the first question
            first_question = questions[0]
            
            # Ensure the question has the necessary keys, especially 'correct_answer_index'
            if 'correct_answer_index' not in first_question:
                print("Error: The first question from quiz_data is missing 'correct_answer_index'.")
                print("Using a dummy question for UI testing.")
                first_question = {
                    'title': 'Dummy Title Test',
                    'question': 'This is a dummy question for run_quiz_question. Correct is B.',
                    'answers': ['Option X', 'Option Y', 'Option Z'],
                    'correct_answer_index': 1 
                }

            was_correct = run_quiz_question(first_question)
            
            if was_correct:
                print("\nResult: You were Correct!")
            else:
                print("\nResult: You were Incorrect.")
        else:
            print("No quiz data found. Make sure 'Neuer_Arzttarif_Frage_Antwort_Spiel.xlsx' exists and is readable.")
            print("Also, ensure quiz_data.py generated data correctly.")
            print("\nUsing a dummy question for UI testing as data loading failed.")
            dummy_question = {
                'title': 'Dummy Title Main',
                'question': 'This is a dummy question because data loading failed. Correct is A.',
                'answers': ['Dummy A', 'Dummy B', 'Dummy C'],
                'correct_answer_index': 0
            }
            was_correct = run_quiz_question(dummy_question)
            if was_correct:
                print("\nResult (dummy): You were Correct!")
            else:
                print("\nResult (dummy): You were Incorrect.")


    except ImportError:
        print("Error: Could not import 'get_quiz_data' from 'quiz_data'.")
        print("Make sure 'quiz_data.py' is in the same directory or accessible in your PYTHONPATH.")
        print("\nUsing a dummy question for UI testing as import failed.")
        dummy_question = {
            'title': 'Dummy Title Import Fail',
            'question': 'This is a dummy question due to import error. Correct is C.',
            'answers': ['Dummy X', 'Dummy Y', 'Dummy Z'],
            'correct_answer_index': 2
        }
        was_correct = run_quiz_question(dummy_question)
        if was_correct:
            print("\nResult (dummy): You were Correct!")
        else:
            print("\nResult (dummy): You were Incorrect.")

    except Exception as e:
        print(f"An unexpected error occurred in the test block: {e}")
        print("\nUsing a dummy question for UI testing due to an unexpected error.")
        dummy_question = {
            'title': 'Dummy Title Error',
            'question': 'This is a dummy question due to an error. Correct is A.',
            'answers': ['ErrorOpt A', 'ErrorOpt B', 'ErrorOpt C'],
            'correct_answer_index': 0
        }
        was_correct = run_quiz_question(dummy_question)
        if was_correct:
            print("\nResult (dummy): You were Correct!")
        else:
            print("\nResult (dummy): You were Incorrect.")
