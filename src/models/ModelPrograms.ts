export const modelPrograms = {
	ants: `patch Ground:
    def setup():
        chemical = 0
        food = 0
        nest = False
        nestScent = 0
        foodSource = 0
        color = "black"
        value = 0

        centerX = patchWidth / 2
        centerY = patchHeight / 2

        nestRadius = 5
        foodRadius = 5

        distanceFromNest = distance_to(centerX, centerY)

        if distanceFromNest < nestRadius:
            nest = True

        nestScent = patchWidth + patchHeight - distanceFromNest

        if distance_to(patchWidth * 0.65, patchHeight * 0.5) < foodRadius:
            foodSource = 1

        if distance_to(patchWidth * 0.28, patchHeight * 0.75) < foodRadius:
            foodSource = 2

        if distance_to(patchWidth * 0.18, patchHeight * 0.25) < foodRadius:
            foodSource = 3

        if foodSource > 0:
            food = 1

        recolor()

    def recolor():
        if nest:
            color = "violet"
            value = 1
        elif food > 0:
            value = food

            if foodSource == 1:
                color = "cyan"
            elif foodSource == 2:
                color = "sky"
            else:
                color = "blue"
        else:
            color = "green"
            value = chemical

agent Ant:
    def setup():
        x = 450
        y = 300
        direction = random(360)
        carrying = False

    def uphill_chemical():
        ahead = patch_value_at_angle("chemical", 0, 1)
        right = patch_value_at_angle("chemical", 45, 1)
        left = patch_value_at_angle("chemical", -45, 1)

        if right > ahead or left > ahead:
            if right > left:
                turn(45)
            else:
                turn(-45)

    def uphill_nest_scent():
        ahead = patch_value_at_angle("nestScent", 0, 1)
        right = patch_value_at_angle("nestScent", 45, 1)
        left = patch_value_at_angle("nestScent", -45, 1)

        if right > ahead or left > ahead:
            if right > left:
                turn(45)
            else:
                turn(-45)

    def look_for_food():
        foodHere = patch_value("food")

        if foodHere > 0:
            foodHere = foodHere - 0.2

            if foodHere < 0:
                foodHere = 0

            set_patch_value("food", foodHere)
            carrying = True
            turn(180)
            return

        chemicalHere = patch_value("chemical")

        if chemicalHere >= 0.01:
            uphill_chemical()

    def return_to_nest():
        if patch_value("nest"):
            carrying = False
            turn(180)
            return

        chemicalHere = patch_value("chemical")
        chemicalHere = chemicalHere + 0.2

        if chemicalHere > 1:
            chemicalHere = 1

        set_patch_value("chemical", chemicalHere)
        uphill_nest_scent()

    def wiggle():
        turn(random(-45, 46))

    def move():
        if carrying:
            return_to_nest()
        else:
            look_for_food()

        wiggle()

        if can_move(8):
            move_forward(8)
        else:
            turn(180)

ants = create(Ant, 500)

def go():
    ask(ants):
        move()

    diffuse("chemical", 0.2)
    evaporate("chemical", 0.02)

    ask(Ground):
        recolor()
`,

	fire: `density = 65

patch Forest:
    def setup():
        state = "empty"
        nextState = "empty"
        color = "black"
        value = 1

        if random(100) < density:
            state = "tree"

        if patchX == 0:
            state = "burning"

        nextState = state
        recolor()

    def prepare_next_state():
        nextState = state

        if state == "tree":
            burningNeighbors = count_neighbors4("state", "burning")

            if burningNeighbors > 0:
                nextState = "burning"
        elif state == "burning":
            nextState = "empty"

    def apply_next_state():
        state = nextState
        recolor()

    def recolor():
        if state == "tree":
            color = "green"
            value = 1
        elif state == "burning":
            color = "red"
            value = 1
        else:
            color = "black"
            value = 1

def go():
    ask(Forest):
        prepare_next_state()
        apply_next_state()
`,

	slime: `patch Ground:
    def setup():
        chemical = 0
        color = "green"
        value = 0

    def recolor():
        color = "green"
        value = chemical / 5

        if value > 1:
            value = 1

agent SlimeCell:
    def setup():
        x = random(900)
        y = random(600)
        direction = random(360)

    def deposit_chemical():
        chemicalHere = patch_value("chemical")
        chemicalHere = chemicalHere + 2
        set_patch_value("chemical", chemicalHere)

    def follow_chemical():
        chemicalHere = patch_value("chemical")

        if chemicalHere < 0.5:
            return

        ahead = patch_value_at_angle("chemical", 0, 1)
        right = patch_value_at_angle("chemical", 45, 1)
        left = patch_value_at_angle("chemical", -45, 1)

        if right > ahead or left > ahead:
            if right > left:
                turn(45)
            else:
                turn(-45)

    def wiggle():
        turn(random(-40, 40 + 1))

    def move():
        follow_chemical()
        wiggle()

        if can_move(4):
            move_forward(4)
        else:
            turn(180)

        deposit_chemical()

cells = create(SlimeCell, 400)

def go():
    ask(cells):
        move()

    diffuse("chemical", 1)
    evaporate("chemical", 0.1)

    ask(Ground):
        recolor()`,

	life: `patch Cell:
    def setup():
        alive = random(100) < 35
        nextAlive = alive
        value = 1

        if alive:
            color = "green"
        else:
            color = "black"

    def prepare_next_state():
        livingNeighbors = count_neighbors("alive", True)
        nextAlive = alive

        if alive:
            if livingNeighbors < 2 or livingNeighbors > 3:
                nextAlive = False
        else:
            if livingNeighbors == 3:
                nextAlive = True

    def apply_next_state():
        alive = nextAlive

        if alive:
            color = "green"
        else:
            color = "black"

        value = 1

def go():
    ask(Cell):
        prepare_next_state()
        apply_next_state()`,
} as const;

export type ModelName =
	keyof typeof modelPrograms;